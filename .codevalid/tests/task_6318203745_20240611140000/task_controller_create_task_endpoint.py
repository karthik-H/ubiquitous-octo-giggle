import pytest
from fastapi.testclient import TestClient
from app.main import app

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
        "description": "Task to create the initial user dashboard.",
        "due_date": "2024-07-15",
        "priority": "high",
        "title": "Create user dashboard"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": "Task to create the initial user dashboard.",
        "due_date": "2024-07-15",
        "id": "generated_task_id",
        "priority": "high",
        "status": "pending",
        "title": "Create user dashboard"
    }
    assert response.json() == expected

def test_create_task_missing_required_field_title():
    payload = {
        "description": "No title provided.",
        "due_date": "2024-07-15"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'title' is required."}

def test_create_task_empty_title():
    payload = {
        "description": "Title is empty.",
        "due_date": "2024-07-15",
        "title": ""
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'title' cannot be empty."}

def test_create_task_invalid_due_date_format():
    payload = {
        "description": "Provide an invalid due_date",
        "due_date": "15-07-2024",
        "title": "Fix bug"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'due_date' must be in YYYY-MM-DD format."}

def test_create_task_title_min_length():
    payload = {
        "description": "Minimal title length",
        "due_date": "2024-07-15",
        "title": "A"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": "Minimal title length",
        "due_date": "2024-07-15",
        "id": "generated_task_id",
        "priority": None,
        "status": "pending",
        "title": "A"
    }
    assert response.json() == expected

def test_create_task_title_max_length():
    max_title = repeat_char("A", 255)
    payload = {
        "description": "Max length title",
        "due_date": "2024-07-15",
        "title": max_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": "Max length title",
        "due_date": "2024-07-15",
        "id": "generated_task_id",
        "priority": None,
        "status": "pending",
        "title": max_title
    }
    assert response.json() == expected

def test_create_task_title_exceeds_max_length():
    overlong_title = repeat_char("A", 256)
    payload = {
        "description": "Title exceeds max length",
        "due_date": "2024-07-15",
        "title": overlong_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'title' exceeds maximum length of 255 characters."}

def test_create_task_missing_optional_fields():
    payload = {
        "title": "Task with required fields"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    expected = {
        "description": None,
        "due_date": None,
        "id": "generated_task_id",
        "priority": None,
        "status": "pending",
        "title": "Task with required fields"
    }
    assert response.json() == expected

def test_create_task_invalid_priority_value():
    payload = {
        "priority": "urgent",
        "title": "Invalid priority"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Field 'priority' must be one of ['low', 'medium', 'high']."}

def test_create_task_duplicate_title():
    payload = {
        "title": "Create user dashboard"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201

    duplicate_payload = {
        "title": "Create user dashboard"
    }
    response = client.post("/tasks", json=duplicate_payload)
    assert response.status_code == 400
    assert response.json() == {"error": "A task with this title already exists."}

def test_create_task_invalid_json_payload():
    # Send invalid JSON (missing quotes)
    response = client.post("/tasks", data="{ title: 'Missing quotes' }", headers={"Content-Type": "application/json"})
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid JSON payload."}