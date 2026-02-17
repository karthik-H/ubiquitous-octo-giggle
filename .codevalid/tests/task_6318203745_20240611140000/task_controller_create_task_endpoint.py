import pytest
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def repeat_char(char, count):
    return char * count

@pytest.fixture(autouse=True)
def clear_tasks(monkeypatch):
    """
    Fixture to clear tasks before each test if the service/repository supports it.
    If not, this can be removed or adapted.
    """
    pass

def test_create_task_with_valid_payload():
    payload = {
        "description": "This is a test task.",
        "due_date": "2024-07-01",
        "title": "Test Task"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": "This is a test task.",
        "due_date": "2024-07-01",
        "id": "generated_task_id",
        "title": "Test Task"
    }
    assert response.json() == expected

def test_create_task_with_missing_title():
    payload = {
        "description": "Missing title field.",
        "due_date": "2024-07-01"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'title' is required."}

def test_create_task_with_empty_title():
    payload = {
        "description": "Title is empty.",
        "due_date": "2024-07-01",
        "title": ""
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'title' cannot be empty."}

def test_create_task_with_maximum_allowed_title_length():
    max_title = repeat_char("T", 255)
    payload = {
        "description": "Boundary test for title length.",
        "due_date": "2024-07-01",
        "title": max_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": "Boundary test for title length.",
        "due_date": "2024-07-01",
        "id": "generated_task_id",
        "title": max_title
    }
    assert response.json() == expected

def test_create_task_with_title_exceeding_maximum_length():
    overlong_title = repeat_char("T", 256)
    payload = {
        "description": "Title too long.",
        "due_date": "2024-07-01",
        "title": overlong_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'title' exceeds maximum length of 255."}

def test_create_task_with_missing_description():
    payload = {
        "due_date": "2024-07-01",
        "title": "Task Without Description"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": None,
        "due_date": "2024-07-01",
        "id": "generated_task_id",
        "title": "Task Without Description"
    }
    assert response.json() == expected

def test_create_task_with_invalid_due_date_format():
    payload = {
        "description": "Testing due date format.",
        "due_date": "01-07-2024",
        "title": "Invalid Due Date"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'due_date' must be in YYYY-MM-DD format."}

def test_create_task_with_past_due_date():
    payload = {
        "description": "Due date is in the past.",
        "due_date": "2023-01-01",
        "title": "Past Due Date"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'due_date' cannot be in the past."}

def test_create_task_with_no_request_body():
    response = client.post("/tasks")
    assert response.status_code == 400
    assert response.json() == {"error": "Request body is missing or invalid JSON."}

def test_create_task_with_invalid_json_body():
    response = client.post("/tasks", data="{invalid_json}", headers={"Content-Type": "application/json"})
    assert response.status_code == 400
    assert response.json() == {"error": "Request body is missing or invalid JSON."}

def test_create_task_with_duplicate_title():
    payload = {
        "description": "First entry.",
        "due_date": "2024-07-01",
        "title": "Duplicate Task"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201

    duplicate_payload = {
        "description": "First entry.",
        "due_date": "2024-07-01",
        "title": "Duplicate Task"
    }
    response = client.post("/tasks", json=duplicate_payload)
    assert response.status_code == 400
    assert response.json() == {"error": "A task with this title already exists."}

def test_create_task_with_extra_fields_in_payload():
    payload = {
        "description": "Extra field included.",
        "due_date": "2024-07-01",
        "priority": "high",
        "title": "Task With Extra Fields"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'priority' is not allowed."}