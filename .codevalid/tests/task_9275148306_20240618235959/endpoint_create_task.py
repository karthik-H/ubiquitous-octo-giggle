import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.task_service import TaskService
from app.controllers.task_controller import router as task_router
from unittest.mock import patch, MagicMock

client = TestClient(app)

# Register router if not already registered (for direct FastAPI app import)
if not hasattr(app, 'routes') or not any(r.path == "/tasks" for r in app.routes):
    app.include_router(task_router)

@pytest.fixture
def valid_task_payload():
    return {
        "description": "Buy milk, eggs, and bread.",
        "due_date": "2024-07-01",
        "priority": "medium",
        "title": "Buy groceries"
    }

@pytest.fixture
def duplicate_task_payload():
    return {
        "description": "Duplicate title test",
        "due_date": "2024-07-02",
        "priority": "medium",
        "title": "Buy groceries"
    }

@pytest.fixture
def max_length_title():
    return "T" * 255

@pytest.fixture
def exceeding_length_title():
    return "T" * 256

@pytest.fixture
def setup_existing_task(valid_task_payload):
    # Simulate existing task in DB for duplicate title test
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.side_effect = Exception("Task title already exists.")
        yield

def test_create_task_with_valid_input(valid_task_payload):
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = {
            **valid_task_payload,
            "id": "generated_task_id",
            "status": "pending"
        }
        response = client.post("/tasks", json=valid_task_payload)
        assert response.status_code == 201
        resp_json = response.json()
        assert resp_json["id"] == "generated_task_id"
        assert resp_json["title"] == valid_task_payload["title"]
        assert resp_json["status"] == "pending"
        assert resp_json["description"] == valid_task_payload["description"]
        assert resp_json["due_date"] == valid_task_payload["due_date"]
        assert resp_json["priority"] == valid_task_payload["priority"]

def test_create_task_with_missing_title():
    payload = {
        "description": "No title provided",
        "due_date": "2024-07-01",
        "priority": "low"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title is required."}

def test_create_task_with_empty_title():
    payload = {
        "description": "Title is empty",
        "due_date": "2024-07-01",
        "priority": "high",
        "title": ""
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title must not be empty."}

def test_create_task_with_missing_body():
    response = client.post("/tasks")
    assert response.status_code == 400
    assert response.json() == {"error": "Request body is required."}

def test_create_task_with_invalid_due_date_format():
    payload = {
        "description": "This date is not valid",
        "due_date": "07-01-2024",
        "priority": "medium",
        "title": "Bad due date"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Due date must be in YYYY-MM-DD format."}

def test_create_task_with_maximum_title_length(max_length_title):
    payload = {
        "description": "Title with maximum length.",
        "due_date": "2024-07-01",
        "priority": "high",
        "title": max_length_title
    }
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.return_value = {
            **payload,
            "id": "generated_task_id",
            "status": "pending"
        }
        response = client.post("/tasks", json=payload)
        assert response.status_code == 201
        resp_json = response.json()
        assert resp_json["title"] == max_length_title
        assert resp_json["id"] == "generated_task_id"
        assert resp_json["status"] == "pending"
        assert resp_json["description"] == payload["description"]
        assert resp_json["due_date"] == payload["due_date"]
        assert resp_json["priority"] == payload["priority"]

def test_create_task_with_title_exceeding_maximum_length(exceeding_length_title):
    payload = {
        "description": "Title exceeds maximum length.",
        "due_date": "2024-07-01",
        "priority": "low",
        "title": exceeding_length_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title must not exceed 255 characters."}

def test_create_task_with_invalid_priority():
    payload = {
        "description": "Priority is not allowed",
        "due_date": "2024-07-01",
        "priority": "urgent",
        "title": "Invalid priority"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Priority must be one of: low, medium, high."}

def test_create_task_with_duplicate_title(valid_task_payload, duplicate_task_payload):
    # Simulate duplicate title error
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.side_effect = Exception("Task title already exists.")
        response = client.post("/tasks", json=duplicate_task_payload)
        assert response.status_code == 400
        assert response.json() == {"error": "Task title already exists."}

def test_create_task_when_task_service_fails(valid_task_payload):
    with patch("app.services.task_service.TaskService.create_task") as mock_create:
        mock_create.side_effect = Exception("Task creation failed due to internal error.")
        response = client.post("/tasks", json=valid_task_payload)
        assert response.status_code == 400
        assert response.json() == {"error": "Task creation failed due to internal error."}