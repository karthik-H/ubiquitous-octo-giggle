import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.controllers.task_controller import router as task_router
from unittest.mock import patch

client = TestClient(app)

if not hasattr(app, 'routes') or not any(r.path == "/tasks" for r in app.routes):
    app.include_router(task_router)

@pytest.fixture
def max_length_title():
    return "T" * 255

@pytest.fixture
def exceeding_length_title():
    return "T" * 256

# Test Case 1: Create Task with Valid Input
def test_create_task_with_valid_input():
    payload = {
        "description": "Write and review all documentation files for the project.",
        "due_date": "2024-07-01",
        "priority": "high",
        "title": "Complete project documentation"
    }
    expected_response = {
        "description": "Write and review all documentation files for the project.",
        "due_date": "2024-07-01",
        "id": 1,
        "priority": "high",
        "status": "pending",
        "title": "Complete project documentation"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response

# Test Case 2: Create Task with Missing Title
def test_create_task_with_missing_title():
    payload = {
        "description": "Description only, no title.",
        "due_date": "2024-07-01",
        "priority": "low"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title is required."}

# Test Case 3: Create Task with Invalid Due Date Format
def test_create_task_with_invalid_due_date_format():
    payload = {
        "description": "This task has invalid due_date.",
        "due_date": "01-07-2024",
        "priority": "medium",
        "title": "Task with bad due date"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid due_date format. Expected YYYY-MM-DD."}

# Test Case 4: Create Task with Missing Optional Fields
def test_create_task_with_missing_optional_fields():
    payload = {
        "title": "Task with required fields"
    }
    expected_response = {
        "description": None,
        "due_date": None,
        "id": 2,
        "priority": "normal",
        "status": "pending",
        "title": "Task with required fields"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response

# Test Case 5: Create Task with Duplicate Title
def test_create_task_with_duplicate_title():
    payload = {
        "description": "Another task with same title.",
        "due_date": "2024-07-02",
        "priority": "low",
        "title": "Complete project documentation"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.side_effect = Exception("Task with the given title already exists.")
        response = client.post("/tasks", json=payload)
        assert response.status_code == 400
        assert response.json() == {"error": "Task with the given title already exists."}

# Test Case 6: Create Task with Empty Title
def test_create_task_with_empty_title():
    payload = {
        "description": "Empty title task.",
        "due_date": "2024-07-01",
        "priority": "medium",
        "title": ""
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title cannot be empty."}

# Test Case 7: Create Task with Very Long Title
def test_create_task_with_very_long_title(max_length_title):
    payload = {
        "description": "Title at boundary length.",
        "due_date": "2024-07-01",
        "priority": "high",
        "title": max_length_title
    }
    expected_response = {
        "description": "Title at boundary length.",
        "due_date": "2024-07-01",
        "id": 3,
        "priority": "high",
        "status": "pending",
        "title": max_length_title
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response

# Test Case 8: Create Task with Overly Long Title
def test_create_task_with_overly_long_title(exceeding_length_title):
    payload = {
        "description": "Title too long.",
        "due_date": "2024-07-01",
        "priority": "high",
        "title": exceeding_length_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title exceeds maximum length of 255 characters."}

# Test Case 9: Create Task with Invalid Priority
def test_create_task_with_invalid_priority():
    payload = {
        "description": "Priority is not one of allowed values.",
        "due_date": "2024-07-01",
        "priority": "urgent",
        "title": "Task with invalid priority"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid priority value. Allowed: low, normal, high."}

# Test Case 10: Create Task with Malformed JSON
def test_create_task_with_malformed_json():
    malformed_json = "{'title': 'Malformed"
    response = client.post("/tasks", data=malformed_json, headers={"Content-Type": "application/json"})
    assert response.status_code == 400
    assert response.json() == {"error": "Malformed JSON payload."}

# Test Case 11: Create Task with Null Fields
def test_create_task_with_null_fields():
    payload = {
        "description": None,
        "due_date": None,
        "priority": None,
        "title": "Task with nulls"
    }
    expected_response = {
        "description": None,
        "due_date": None,
        "id": 4,
        "priority": "normal",
        "status": "pending",
        "title": "Task with nulls"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response