import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../app')))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_task_success():
    payload = {
        "title": "Test Task",
        "description": "This is a test task.",
        "priority": 3,
        "due_date": "2026-02-20",
        "user_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["priority"] == payload["priority"]
    assert data["due_date"] == payload["due_date"]
    assert data["user_name"] == payload["user_name"]
    assert "id" in data

def test_create_task_invalid_priority():
    payload = {
        "title": "Invalid Priority",
        "description": "Priority out of range.",
        "priority": 10,
        "due_date": "2026-02-20",
        "user_name": "bob"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422  # Validation error