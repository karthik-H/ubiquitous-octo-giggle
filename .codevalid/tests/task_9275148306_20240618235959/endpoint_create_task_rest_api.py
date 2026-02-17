import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_tasks():
    # If there's a global or in-memory DB, clear it here.
    # Otherwise, assume each test starts with no tasks.
    pass

def test_create_task_successful():
    data = {
        "title": "Complete API documentation",
        "description": "Write full documentation for the API endpoints.",
        "priority": "high",
        "due_date": "2024-07-10"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 201
    resp = response.json()
    assert resp == {
        "id": 1,
        "title": "Complete API documentation",
        "description": "Write full documentation for the API endpoints.",
        "priority": "high",
        "due_date": "2024-07-10",
        "status": "pending"
    }

def test_create_task_missing_title():
    data = {
        "description": "Task without a title.",
        "priority": "medium",
        "due_date": "2024-07-10"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Title is required."}

def test_create_task_empty_title():
    data = {
        "title": "",
        "description": "Empty title test.",
        "priority": "low",
        "due_date": "2024-07-10"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Title cannot be empty."}

def test_create_task_invalid_priority():
    data = {
        "title": "Invalid priority task",
        "description": "Test invalid priority value.",
        "priority": "urgent",
        "due_date": "2024-07-10"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Priority must be one of: low, medium, high."}

def test_create_task_missing_due_date():
    data = {
        "title": "Task without due date",
        "description": "Testing missing due_date.",
        "priority": "medium"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 201
    resp = response.json()
    # due_date can be omitted or null
    expected = {
        "id": 2,
        "title": "Task without due date",
        "description": "Testing missing due_date.",
        "priority": "medium",
        "status": "pending"
    }
    # due_date may be omitted or present as None/null
    for k, v in expected.items():
        assert resp[k] == v
    assert "due_date" not in resp or resp["due_date"] is None

def test_create_task_invalid_due_date_format():
    data = {
        "title": "Invalid due date format",
        "description": "Due date format test.",
        "priority": "high",
        "due_date": "07-10-2024"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "due_date must be in YYYY-MM-DD format."}

def test_create_task_large_title():
    max_title = "T" * 255
    data = {
        "title": max_title,
        "description": "Boundary test for title length.",
        "priority": "low",
        "due_date": "2024-07-10"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 201
    resp = response.json()
    assert resp == {
        "id": 3,
        "title": max_title,
        "description": "Boundary test for title length.",
        "priority": "low",
        "due_date": "2024-07-10",
        "status": "pending"
    }

def test_create_task_title_exceeds_max_length():
    too_long_title = "T" * 256
    data = {
        "title": too_long_title,
        "description": "Title exceeds max length.",
        "priority": "low",
        "due_date": "2024-07-10"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Title exceeds maximum allowed length of 255 characters."}

def test_create_task_invalid_json_body():
    response = client.post("/tasks", data="Invalid JSON string", headers={"Content-Type": "application/json"})
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid JSON payload."}

def test_create_task_duplicate_title():
    # First, create the task
    data = {
        "title": "Unique Task Title",
        "description": "First task.",
        "priority": "medium",
        "due_date": "2024-07-10"
    }
    response1 = client.post("/tasks", json=data)
    assert response1.status_code == 201
    # Try to create again with same title
    data2 = {
        "title": "Unique Task Title",
        "description": "Duplicate title test.",
        "priority": "medium",
        "due_date": "2024-07-10"
    }
    response2 = client.post("/tasks", json=data2)
    assert response2.status_code == 400
    assert response2.json() == {"detail": "A task with this title already exists."}

def test_create_task_extra_fields():
    data = {
        "title": "Task with extra fields",
        "description": "Testing extra fields.",
        "priority": "medium",
        "due_date": "2024-07-10",
        "extra_field": "unexpected"
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Unexpected field: extra_field."}
