"""Iteration 3 backend tests: badges + meal photos + files auth.

All state (headers, program_id, upload path) is shared inside ONE class so
`--dist loadscope` keeps everything on a single xdist worker.
"""
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


def _tiny_jpeg(size_bytes: int = 2048) -> bytes:
    """Small but valid JPEG (SOI + APP0 JFIF header + EOI, padded)."""
    # Minimal JFIF header
    head = bytes.fromhex(
        "FFD8FFE000104A46494600010100000100010000"
    )
    tail = bytes.fromhex("FFD9")
    body = bytes([0xFF, 0x00] * ((size_bytes - len(head) - len(tail)) // 2))
    out = head + body + tail
    return out


class TestIteration3PhotosAndBadges:
    _headers = None
    _headers_other = None
    _token = None
    _token_other = None
    _program_id = None
    _photo_path = None

    @classmethod
    def _auth_main(cls):
        if cls._headers is None:
            email = f"test_it3_{uuid.uuid4().hex[:8]}@test.fr"
            r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "secret123", "name": "T It3"}, timeout=15)
            assert r.status_code == 200, r.text
            cls._token = r.json()["session_token"]
            cls._headers = {"Authorization": f"Bearer {cls._token}"}
        return cls._headers

    @classmethod
    def _auth_other(cls):
        if cls._headers_other is None:
            email = f"test_it3b_{uuid.uuid4().hex[:8]}@test.fr"
            r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "secret123", "name": "T It3 B"}, timeout=15)
            assert r.status_code == 200, r.text
            cls._token_other = r.json()["session_token"]
            cls._headers_other = {"Authorization": f"Bearer {cls._token_other}"}
        return cls._headers_other

    # ---- 01: bootstrap program (duration=1 for speed) ----
    def test_01_bootstrap_program(self):
        h = self._auth_main()
        tgt = requests.get(f"{API}/targets", headers=h, timeout=10).json()
        tgt["duration_weeks"] = 1
        assert requests.put(f"{API}/targets", json=tgt, headers=h, timeout=10).status_code == 200
        r = requests.post(f"{API}/programs/generate", headers=h, timeout=60)
        assert r.status_code == 200, r.text
        TestIteration3PhotosAndBadges._program_id = r.json()["id"]

    # ---- 02: badges shape ----
    def test_02_badges_shape(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        r = requests.get(f"{API}/programs/{pid}/badges", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("weeks", "badges", "meals_done", "meals_total", "best_streak", "meal_times"):
            assert k in d, f"missing {k}"
        assert len(d["badges"]) == 6
        expected_ids = {"first_cook", "explorer", "streak3", "gourmet", "shopper", "perfect"}
        assert {b["id"] for b in d["badges"]} == expected_ids
        for b in d["badges"]:
            for k in ("id", "label", "icon", "desc", "earned", "progress", "target"):
                assert k in b
            assert isinstance(b["earned"], bool)
            assert isinstance(b["progress"], (int, float))
            assert isinstance(b["target"], (int, float))
        for w in d["weeks"]:
            for k in ("week", "meals_done", "meals_total", "shopping_checked", "shopping_total", "perfect_week", "shopping_complete"):
                assert k in w
        # meal_times has all 4 keys
        for k in ("breakfast", "lunch", "snack", "dinner"):
            assert k in d["meal_times"]

    # ---- 03: meals_done increments + first_cook earned after done ----
    def test_03_first_cook_earned_after_done(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        before = requests.get(f"{API}/programs/{pid}/badges", headers=h, timeout=15).json()
        before_done = before["meals_done"]
        first_cook_before = next(b for b in before["badges"] if b["id"] == "first_cook")
        # mark lunch day 0 as done
        r = requests.post(f"{API}/programs/{pid}/meals/action",
                          json={"week": 0, "day": 0, "meal": "lunch", "action": "done"},
                          headers=h, timeout=15)
        assert r.status_code == 200
        after = requests.get(f"{API}/programs/{pid}/badges", headers=h, timeout=15).json()
        assert after["meals_done"] == before_done + 1
        first_cook_after = next(b for b in after["badges"] if b["id"] == "first_cook")
        assert first_cook_after["earned"] is True
        # if it was already earned (rare), just ensure no regression
        assert first_cook_after["progress"] >= max(1, first_cook_before["progress"])

    # ---- 04: upload photo (valid small JPEG) ----
    def test_04_upload_photo_ok_or_env(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        img = _tiny_jpeg(1024)
        files = {"file": ("meal.jpg", io.BytesIO(img), "image/jpeg")}
        params = {"week": 0, "day": 0, "meal": "lunch"}
        r = requests.post(f"{API}/programs/{pid}/meals/photo", params=params, files=files, headers=h, timeout=60)
        if r.status_code in (402, 503):
            pytest.skip(f"Object storage unavailable in this env: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        path = d.get("path")
        assert isinstance(path, str) and path.startswith("mon-plan-alimentaire/uploads/"), path
        # path contains the user_id folder
        me = requests.get(f"{API}/auth/me", headers=h, timeout=10).json()
        assert f"/uploads/{me['user_id']}/" in path
        # returned day has meal.photo == path
        assert d["day"]["meals"]["lunch"]["photo"] == path
        TestIteration3PhotosAndBadges._photo_path = path

    # ---- 05: GET /files with token ----
    def test_05_get_file_with_token(self):
        if not TestIteration3PhotosAndBadges._photo_path:
            pytest.skip("no photo uploaded (storage unavailable)")
        path = TestIteration3PhotosAndBadges._photo_path
        tok = TestIteration3PhotosAndBadges._token
        r = requests.get(f"{API}/files/{path}", params={"token": tok}, timeout=30)
        assert r.status_code == 200, r.text[:200]
        ctype = r.headers.get("Content-Type", "")
        assert ctype.startswith("image/"), ctype

    def test_06_get_file_without_token_401(self):
        if not TestIteration3PhotosAndBadges._photo_path:
            pytest.skip("no photo uploaded")
        path = TestIteration3PhotosAndBadges._photo_path
        r = requests.get(f"{API}/files/{path}", timeout=15)
        assert r.status_code == 401, r.text[:200]

    def test_07_get_file_other_user_404(self):
        if not TestIteration3PhotosAndBadges._photo_path:
            pytest.skip("no photo uploaded")
        path = TestIteration3PhotosAndBadges._photo_path
        other = self._auth_other()
        tok_other = TestIteration3PhotosAndBadges._token_other
        # via query token
        r = requests.get(f"{API}/files/{path}", params={"token": tok_other}, timeout=15)
        assert r.status_code == 404, r.text[:200]
        # also via header
        r2 = requests.get(f"{API}/files/{path}", headers=other, timeout=15)
        assert r2.status_code == 404, r2.text[:200]

    # ---- 08: delete photo ----
    def test_08_delete_photo(self):
        if not TestIteration3PhotosAndBadges._photo_path:
            pytest.skip("no photo uploaded")
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        r = requests.delete(f"{API}/programs/{pid}/meals/photo", params={"week": 0, "day": 0, "meal": "lunch"}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert "photo" not in d["day"]["meals"]["lunch"], d["day"]["meals"]["lunch"]

    # ---- 09: photo > 8MB → 413 ----
    def test_09_photo_too_large(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        big = b"\xff\xd8" + b"A" * (8 * 1024 * 1024 + 10) + b"\xff\xd9"
        files = {"file": ("big.jpg", io.BytesIO(big), "image/jpeg")}
        params = {"week": 0, "day": 0, "meal": "lunch"}
        r = requests.post(f"{API}/programs/{pid}/meals/photo", params=params, files=files, headers=h, timeout=120)
        assert r.status_code == 413, f"expected 413 got {r.status_code} {r.text[:200]}"

    # ---- 10: invalid week/day/meal → 404 ----
    def test_10_photo_invalid_week(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        img = _tiny_jpeg(512)
        files = {"file": ("meal.jpg", io.BytesIO(img), "image/jpeg")}
        # invalid week
        r = requests.post(f"{API}/programs/{pid}/meals/photo", params={"week": 99, "day": 0, "meal": "lunch"}, files=files, headers=h, timeout=30)
        assert r.status_code == 404, r.text[:200]

    def test_11_photo_invalid_day(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        img = _tiny_jpeg(512)
        files = {"file": ("meal.jpg", io.BytesIO(img), "image/jpeg")}
        r = requests.post(f"{API}/programs/{pid}/meals/photo", params={"week": 0, "day": 99, "meal": "lunch"}, files=files, headers=h, timeout=30)
        assert r.status_code == 404, r.text[:200]

    def test_12_photo_invalid_meal(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        img = _tiny_jpeg(512)
        files = {"file": ("meal.jpg", io.BytesIO(img), "image/jpeg")}
        r = requests.post(f"{API}/programs/{pid}/meals/photo", params={"week": 0, "day": 0, "meal": "brunch"}, files=files, headers=h, timeout=30)
        assert r.status_code == 404, r.text[:200]

    def test_13_delete_photo_invalid_meal(self):
        h = self._auth_main()
        pid = TestIteration3PhotosAndBadges._program_id
        r = requests.delete(f"{API}/programs/{pid}/meals/photo", params={"week": 0, "day": 0, "meal": "brunch"}, headers=h, timeout=15)
        assert r.status_code == 404
