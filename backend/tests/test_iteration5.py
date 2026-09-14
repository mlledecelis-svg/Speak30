"""Iteration 5 backend tests: hydration + photos gallery + favorites + outside meals + regression."""
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


def _mk_jpeg() -> bytes:
    # Minimal valid JPEG (100x100 tiny) — using PIL if available, else a raw stub.
    try:
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (32, 32), (200, 120, 60)).save(buf, format="JPEG", quality=70)
        return buf.getvalue()
    except Exception:
        # SOI + a bit + EOI (won't be a valid image for decoders, but backend does not decode it)
        return b"\xff\xd8\xff\xe0" + b"\x00" * 32 + b"\xff\xd9"


class TestIteration5:
    _headers = None
    _program_id = None

    @classmethod
    def _auth(cls):
        if cls._headers is None:
            email = f"test_it5_{uuid.uuid4().hex[:8]}@test.fr"
            r = requests.post(
                f"{API}/auth/signup",
                json={"email": email, "password": "secret123", "name": "T It5"},
                timeout=15,
            )
            assert r.status_code == 200, r.text
            cls._headers = {"Authorization": f"Bearer {r.json()['session_token']}"}
        return cls._headers

    @classmethod
    def _program(cls):
        if cls._program_id is None:
            h = cls._auth()
            r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
            assert r.status_code == 200, r.text
            cls._program_id = r.json()["id"]
        return cls._program_id

    # -------- Hydration --------
    def test_01_hydration_today_default(self):
        h = self._auth()
        r = requests.get(f"{API}/hydration/today", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        # shape
        assert set(["date", "glasses", "goal", "progress", "history"]).issubset(d.keys())
        assert isinstance(d["date"], str) and len(d["date"]) == 10 and d["date"][4] == "-"
        assert d["glasses"] == 0
        assert d["goal"] == 4  # 1 L de départ (4 verres de 250 ml)
        assert d["progress"] == 0
        assert isinstance(d["history"], list)

    def test_02_hydration_post_plus3(self):
        h = self._auth()
        r = requests.post(f"{API}/hydration", json={"delta": 3}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["glasses"] == 3
        assert d["progress"] == 75  # 3 verres sur 4

    def test_03_hydration_post_floor_at_zero(self):
        h = self._auth()
        r = requests.post(f"{API}/hydration", json={"delta": -10}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["glasses"] == 0

    def test_04_hydration_bad_date_400(self):
        h = self._auth()
        r = requests.post(f"{API}/hydration", json={"delta": 1, "date": "bad"}, headers=h, timeout=15)
        assert r.status_code == 400, r.text

    def test_05_hydration_goal_ok(self):
        h = self._auth()
        r = requests.put(f"{API}/hydration/goal", json={"goal": 10}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["goal"] == 10
        # persisted
        r2 = requests.get(f"{API}/hydration/today", headers=h, timeout=15)
        assert r2.json()["goal"] == 10

    def test_06_hydration_goal_too_low(self):
        h = self._auth()
        r = requests.put(f"{API}/hydration/goal", json={"goal": 1}, headers=h, timeout=15)
        assert r.status_code == 400, r.text

    def test_07_hydration_goal_too_high(self):
        h = self._auth()
        r = requests.put(f"{API}/hydration/goal", json={"goal": 25}, headers=h, timeout=15)
        assert r.status_code == 400, r.text

    # -------- Photos gallery --------
    def test_08_photos_empty(self):
        h = self._auth()
        # Ensure the program exists (side effect isolates state)
        self._program()
        r = requests.get(f"{API}/photos", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        p = r.json()
        assert "photos" in p and isinstance(p["photos"], list)
        assert "total" in p and isinstance(p["total"], int)

    def test_09_photos_upload_then_listed_then_deleted(self):
        h = self._auth()
        pid = self._program()
        img = _mk_jpeg()
        files = {"file": ("meal.jpg", img, "image/jpeg")}
        r = requests.post(
            f"{API}/programs/{pid}/meals/photo",
            headers=h,
            params={"week": 0, "day": 0, "meal": "lunch"},
            files=files,
            timeout=30,
        )
        if r.status_code == 402:
            pytest.skip("Object storage unavailable in this env")
        assert r.status_code == 200, r.text
        path = r.json()["path"]
        assert path.startswith("mon-plan-alimentaire/uploads/") and path.endswith(".jpg")

        rl = requests.get(f"{API}/photos", headers=h, timeout=15)
        assert rl.status_code == 200, rl.text
        photos = rl.json()["photos"]
        match = [p for p in photos if p["path"] == path]
        assert len(match) == 1, f"uploaded photo not listed: {photos}"
        m = match[0]
        assert m["week"] == 0 and m["day"] == 0 and m["meal"] == "lunch"
        assert m["meal_label"] == "Déjeuner"
        assert isinstance(m["recipe_name"], str) and m["recipe_name"]

        # cleanup via DELETE
        rd = requests.delete(
            f"{API}/programs/{pid}/meals/photo",
            headers=h,
            params={"week": 0, "day": 0, "meal": "lunch"},
            timeout=15,
        )
        assert rd.status_code == 200, rd.text
        # after DELETE, photo removed from meal (still present in db.photos, but no longer in /photos list which sources from program)
        rl2 = requests.get(f"{API}/photos", headers=h, timeout=15)
        assert not any(p["path"] == path for p in rl2.json()["photos"])

    # -------- Favorites --------
    def test_10_favorites_toggle_flow(self):
        h = self._auth()
        pid = self._program()

        # get expected recipe name
        rp = requests.get(f"{API}/programs/{pid}", headers=h, timeout=15)
        assert rp.status_code == 200
        prog = rp.json()
        recipe_name = prog["weeks"][0]["days"][1]["meals"]["lunch"]["recipe"]["name"]

        # favorite it
        ra = requests.post(
            f"{API}/programs/{pid}/meals/action",
            headers=h,
            json={"week": 0, "day": 1, "meal": "lunch", "action": "favorite"},
            timeout=15,
        )
        assert ra.status_code == 200, ra.text

        rf = requests.get(f"{API}/favorites", headers=h, timeout=15)
        assert rf.status_code == 200
        favs = rf.json()["favorites"]
        match = [f for f in favs if f["recipe"]["name"] == recipe_name and f["week"] == 0 and f["day"] == 1 and f["meal"] == "lunch"]
        assert len(match) == 1, f"favorite not returned: {favs}"

        # re-toggle → removed from meal.favorite AND from prefs.favorites
        rt = requests.post(
            f"{API}/programs/{pid}/meals/action",
            headers=h,
            json={"week": 0, "day": 1, "meal": "lunch", "action": "favorite"},
            timeout=15,
        )
        assert rt.status_code == 200

        rf2 = requests.get(f"{API}/favorites", headers=h, timeout=15)
        favs2 = rf2.json()["favorites"]
        # meal is no longer flagged favorite; blueprint no longer in prefs.favorites
        still = [f for f in favs2 if f["week"] == 0 and f["day"] == 1 and f["meal"] == "lunch"]
        assert still == [] or all(not x.get("favorite") for x in still), f"favorite not removed: {favs2}"

    # -------- Outside meals --------
    def test_11_outside_toggle_flow(self):
        h = self._auth()
        pid = self._program()

        r1 = requests.post(
            f"{API}/programs/{pid}/meals/action",
            headers=h,
            json={"week": 0, "day": 2, "meal": "dinner", "action": "outside"},
            timeout=15,
        )
        assert r1.status_code == 200, r1.text
        day = r1.json()["day"]
        assert day["meals"]["dinner"]["outside"] is True
        assert day["meals"]["dinner"]["done"] is True

        r2 = requests.post(
            f"{API}/programs/{pid}/meals/action",
            headers=h,
            json={"week": 0, "day": 2, "meal": "dinner", "action": "outside"},
            timeout=15,
        )
        assert r2.status_code == 200
        day2 = r2.json()["day"]
        assert day2["meals"]["dinner"]["outside"] is False
        # done can stay true — that's the documented behavior

    # -------- Regression --------
    def test_12_regression_current_and_shopping(self):
        h = self._auth()
        pid = self._program()

        rc = requests.get(f"{API}/programs/current", headers=h, timeout=15)
        assert rc.status_code == 200
        assert rc.json()["id"] == pid

        rb = requests.get(f"{API}/programs/{pid}/badges", headers=h, timeout=15)
        assert rb.status_code == 200
        assert len(rb.json()["badges"]) == 6

        rs = requests.get(f"{API}/programs/{pid}/shopping/0", headers=h, timeout=15)
        assert rs.status_code == 200
        s = rs.json()
        assert "checked" in s and "total" in s
