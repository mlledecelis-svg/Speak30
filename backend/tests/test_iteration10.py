"""Iteration 10 — Repas invités (guests) + régression (generate/recap/backup)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    email = f"test_it10_{uuid.uuid4().hex[:8]}@test.fr"
    r = s.post(f"{BASE_URL}/api/auth/signup", json={"email": email, "password": "pw123456", "name": "IT10"})
    assert r.status_code == 200, r.text
    tok = r.json()["session_token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    return s


@pytest.fixture(scope="module")
def program(session):
    r = session.post(f"{BASE_URL}/api/programs/generate")
    assert r.status_code == 200, r.text
    return r.json()


class TestGuests:
    def test_guests_set_3_increases_shopping(self, session, program):
        pid = program["id"]

        # Baseline shopping (guests=1 by default)
        r0 = session.get(f"{BASE_URL}/api/programs/{pid}/shopping/0")
        assert r0.status_code == 200, r0.text
        baseline = r0.json()

        # Set guests=3 on week 0, day 1, dinner
        r = session.post(
            f"{BASE_URL}/api/programs/{pid}/meals/action",
            json={"action": "guests", "value": 3, "week": 0, "day": 1, "meal": "dinner"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # confirm day meta reflects guests
        day = data.get("day") or {}
        dinner = day.get("meals", {}).get("dinner", {})
        assert dinner.get("guests") == 3, f"expected guests=3, got {dinner.get('guests')} — payload keys: {list(data.keys())}"

        # Fetch shopping again → some raw_grams should have increased
        r1 = session.get(f"{BASE_URL}/api/programs/{pid}/shopping/0")
        assert r1.status_code == 200
        after = r1.json()

        # Build name→raw_grams map (sum across sections)
        def totals(sh):
            out = {}
            for sec in sh.get("sections", []):
                for it in sec.get("items", []):
                    out[it["name"]] = out.get(it["name"], 0) + it["raw_grams"]
            for it in sh.get("home", []):
                out[it["name"]] = out.get(it["name"], 0) + it.get("raw_grams", 0)
            return out

        b = totals(baseline)
        a = totals(after)
        increased = [k for k in a if a[k] > b.get(k, 0)]
        assert increased, f"expected some raw_grams to increase after guests=3, got no change. baseline={b} after={a}"

    def test_guests_reset_to_1(self, session, program):
        pid = program["id"]
        r = session.post(
            f"{BASE_URL}/api/programs/{pid}/meals/action",
            json={"action": "guests", "value": 1, "week": 0, "day": 1, "meal": "dinner"},
        )
        assert r.status_code == 200, r.text
        day = r.json().get("day") or {}
        dinner = day.get("meals", {}).get("dinner", {})
        assert dinner.get("guests") == 1

        # Shopping should be equal to a fresh generate baseline (or at least not have the guest bump)
        r1 = session.get(f"{BASE_URL}/api/programs/{pid}/shopping/0")
        assert r1.status_code == 200

    def test_guests_invalid_value_0(self, session, program):
        pid = program["id"]
        r = session.post(
            f"{BASE_URL}/api/programs/{pid}/meals/action",
            json={"action": "guests", "value": 0, "week": 0, "day": 1, "meal": "dinner"},
        )
        assert r.status_code == 400, f"expected 400 for value=0, got {r.status_code}: {r.text}"

    def test_guests_invalid_value_9(self, session, program):
        pid = program["id"]
        r = session.post(
            f"{BASE_URL}/api/programs/{pid}/meals/action",
            json={"action": "guests", "value": 9, "week": 0, "day": 1, "meal": "dinner"},
        )
        assert r.status_code == 400, f"expected 400 for value=9, got {r.status_code}: {r.text}"


class TestRegression:
    def test_generate_ok(self, session):
        r = session.post(f"{BASE_URL}/api/programs/generate")
        assert r.status_code == 200, r.text
        assert r.json().get("weeks")

    def test_recap_ok(self, session):
        r0 = session.get(f"{BASE_URL}/api/programs/current")
        pid = r0.json()["id"]
        r = session.get(f"{BASE_URL}/api/programs/{pid}/recap/0")
        assert r.status_code == 200

    def test_backup_ok(self, session):
        r = session.get(f"{BASE_URL}/api/backup")
        assert r.status_code == 200
        data = r.json()
        assert data.get("version") == 1
        assert isinstance(data.get("program"), dict)
