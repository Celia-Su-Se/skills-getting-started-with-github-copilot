from urllib.parse import quote
import copy

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture(autouse=True)
def reset_activities():
    # Keep a fresh copy of the in-memory activities for each test
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities = original


def client():
    return TestClient(app_module.app)


def test_get_activities():
    c = client()
    res = c.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # basic check that an expected activity exists
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]


def test_signup_and_unregister_flow():
    c = client()
    activity = "Tennis Club"
    email = "tester@mergington.edu"

    # Ensure initial count
    before = c.get("/activities").json()[activity]["participants"]
    before_count = len(before)

    # Sign up
    signup_path = f"/activities/{quote(activity)}/signup"
    r = c.post(signup_path, params={"email": email})
    assert r.status_code == 200
    assert email in r.json().get("message", "")

    # Verify participant present
    after = c.get("/activities").json()[activity]["participants"]
    assert email in after
    assert len(after) == before_count + 1

    # Unregister
    delete_path = f"/activities/{quote(activity)}/participants"
    r2 = c.delete(delete_path, params={"email": email})
    assert r2.status_code == 200
    assert email in r2.json().get("message", "")

    # Verify removed
    final = c.get("/activities").json()[activity]["participants"]
    assert email not in final
    assert len(final) == before_count
