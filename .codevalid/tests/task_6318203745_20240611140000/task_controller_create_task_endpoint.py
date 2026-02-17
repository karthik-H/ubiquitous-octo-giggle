import pytest
from fastapi.testclient import TestClient
from app.main import app

import json

client = TestClient(app)

# Utility for generating long titles
def repeat_char(char, count):
    return char * count

@pytest.fixture(autouse=True)
def clear_tasks(monkeypatch):
    """
    Fixture to clear tasks before each test if the service/repository supports it.
    If not, this can be removed or adapted.
    """
    # If your service/repository has a clear/reset method, call it here.
    # For example:
    # from app.repositories.task_repository import TaskRepository
    # TaskRepository._tasks.clear()
    pass

def test_create_task_success():
    payload = {
        "description": "Write and review unit tests for task controller.",
        "due_date": "2024-07-01",
        "title": "Finish unit test"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": "Write and review unit tests for task controller.",
        "due_date": "2024-07-01",
        "id": 1,
        "status": "pending",
        "title": "Finish unit test"
    }
    assert response.json() == expected

def test_create_task_missing_title():
    payload = {
        "description": "Task without a title.",
        "due_date": "2024-07-01"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"detail": "Field 'title' is required."}

def test_create_task_invalid_due_date_format():
    payload = {
        "description": "due_date is invalid format",
        "due_date": "01-07-2024",
        "title": "Check date validation"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"detail": "Field 'due_date' must be in YYYY-MM-DD format."}

def test_create_task_duplicate_title():
    # First, create the initial task
    payload = {
        "description": "Write and review unit tests for task controller.",
        "due_date": "2024-07-01",
        "title": "Finish unit test"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201

    # Attempt to create a duplicate
    duplicate_payload = {
        "description": "Another task with duplicate title.",
        "due_date": "2024-07-05",
        "title": "Finish unit test"
    }
    response = client.post("/tasks", json=duplicate_payload)
    assert response.status_code == 400
    assert response.json() == {"detail": "Task with this title already exists."}

def test_create_task_empty_body():
    response = client.post("/tasks", data=json.dumps({}), headers={"Content-Type": "application/json"})
    assert response.status_code == 400
    assert response.json() == {"detail": "Request body is empty or invalid."}

def test_create_task_long_title():
    long_title = repeat_char("T", 255)
    payload = {
        "description": "Edge case test for maximum title length.",
        "due_date": "2024-07-01",
        "title": long_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": "Edge case test for maximum title length.",
        "due_date": "2024-07-01",
        "id": 2,
        "status": "pending",
        "title": long_title
    }
    assert response.json() == expected

def test_create_task_overlong_title():
    overlong_title = repeat_char("T", 256)
    payload = {
        "description": "Title is 256 chars, exceeding limit.",
        "due_date": "2024-07-01",
        "title": overlong_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"detail": "Field 'title' exceeds maximum length of 255 characters."}

def test_create_task_null_description():
    payload = {
        "description": None,
        "due_date": "2024-07-02",
        "title": "Task with no description"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": None,
        "due_date": "2024-07-02",
        "id": 3,
        "status": "pending",
        "title": "Task with no description"
    }
    assert response.json() == expected

def test_create_task_unexpected_extra_field():
    payload = {
        "description": "Payload includes an extra field.",
        "due_date": "2024-07-03",
        "title": "Extra field test",
        "unexpected_field": "unexpected_value"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"detail": "Unexpected field 'unexpected_field' in request body."}

def test_create_task_no_content_type():
    payload = {
        "description": "No Content-Type header",
        "due_date": "2024-07-01",
        "title": "Missing header"
    }
    # Send as data, not as json, and omit Content-Type header
    response = client.post("/tasks", data=json.dumps(payload))
    assert response.status_code == 400
    assert response.json() == {"detail": "Missing or invalid Content-Type header."}