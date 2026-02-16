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

# Test Case 1: Create Task Successfully
def test_create_task_successfully():
    payload = {
        "description": "Document all endpoints and workflows",
        "due_date": "2024-07-01",
        "priority": 3,
        "title": "Complete project documentation"
    }
    expected_response = {
        "description": "Document all endpoints and workflows",
        "due_date": "2024-07-01",
        "id": 101,
        "priority": 3,
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
        "description": "Document workflows",
        "due_date": "2024-07-01",
        "priority": 2
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title is required"}

# Test Case 3: Create Task with Invalid Priority
def test_create_task_with_invalid_priority():
    payload = {
        "description": "Fix critical bug",
        "due_date": "2024-07-05",
        "priority": 10,
        "title": "Urgent bug fix"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Priority must be between 1 and 5"}

# Test Case 4: Create Task with Empty Title
def test_create_task_with_empty_title():
    payload = {
        "description": "Empty title test",
        "due_date": "2024-07-10",
        "priority": 1,
        "title": ""
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title cannot be empty"}

# Test Case 5: Create Task with Invalid Due Date Format
def test_create_task_with_invalid_due_date_format():
    payload = {
        "description": "Testing bad date",
        "due_date": "07/10/2024",
        "priority": 2,
        "title": "Task with invalid date"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid due_date format, expected YYYY-MM-DD"}

# Test Case 6: Create Task with Maximum Title Length
def test_create_task_with_maximum_title_length(max_length_title):
    payload = {
        "description": "Testing max title length",
        "due_date": "2024-07-20",
        "priority": 1,
        "title": max_length_title
    }
    expected_response = {
        "description": "Testing max title length",
        "due_date": "2024-07-20",
        "id": 102,
        "priority": 1,
        "status": "pending",
        "title": max_length_title
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response

# Test Case 7: Create Task with Minimum Priority
def test_create_task_with_minimum_priority():
    payload = {
        "description": "Priority 1 test",
        "due_date": "2024-07-15",
        "priority": 1,
        "title": "Low priority task"
    }
    expected_response = {
        "description": "Priority 1 test",
        "due_date": "2024-07-15",
        "id": 103,
        "priority": 1,
        "status": "pending",
        "title": "Low priority task"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response

# Test Case 8: Create Task with Maximum Priority
def test_create_task_with_maximum_priority():
    payload = {
        "description": "Priority 5 test",
        "due_date": "2024-07-18",
        "priority": 5,
        "title": "High priority task"
    }
    expected_response = {
        "description": "Priority 5 test",
        "due_date": "2024-07-18",
        "id": 104,
        "priority": 5,
        "status": "pending",
        "title": "High priority task"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response

# Test Case 9: Create Task without Description
def test_create_task_without_description():
    payload = {
        "due_date": "2024-07-19",
        "priority": 2,
        "title": "Task without description"
    }
    expected_response = {
        "description": "",
        "due_date": "2024-07-19",
        "id": 105,
        "priority": 2,
        "status": "pending",
        "title": "Task without description"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = expected_response
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        assert response.json() == expected_response

# Test Case 10: Create Task with Invalid JSON Payload
def test_create_task_with_invalid_json_payload():
    malformed_json = "{'title': 'Malformed"
    response = client.post("/tasks", data=malformed_json, headers={"Content-Type": "application/json"})
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid JSON payload"}

# Test Case 11: Create Task with Duplicate Title
def test_create_task_with_duplicate_title():
    payload = {
        "description": "Duplicate title test",
        "due_date": "2024-07-21",
        "priority": 3,
        "title": "Complete project documentation"
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.side_effect = Exception("Task with this title already exists")
        response = client.post("/tasks", json=payload)
        assert response.status_code == 400
        assert response.json() == {"error": "Task with this title already exists"}