import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.controllers.task_controller import router
from app.domain.models.task import TaskCreate
from datetime import date, timedelta

app = FastAPI()
app.include_router(router)

client = TestClient(app)

def make_task_body(**kwargs):
    """Helper to build task request bodies with defaults."""
    base = {
        "title": "Default Title",
        "description": "Default Description",
        "priority": 1,
        "due_date": (date.today() + timedelta(days=1)).isoformat(),
        "user_name": "default_user"
    }
    base.update(kwargs)
    return base

def repeat_str(length):
    return "A" * length

# Test Case 1: create_task_with_valid_data
def test_create_task_with_valid_data():
    body = {
        "description": "Write the user guide for API.",
        "due_date": "2024-07-01",
        "priority": 2,
        "title": "Write documentation",
        "user_name": "alice"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["description"] == body["description"]
    assert data["due_date"] == body["due_date"]
    assert data["priority"] == body["priority"]
    assert data["title"] == body["title"]
    assert data["user_name"] == body["user_name"]
    assert "id" in data

# Test Case 2: create_task_with_missing_title
def test_create_task_with_missing_title():
    body = {
        "description": "No title provided.",
        "due_date": "2024-07-05",
        "priority": 1,
        "user_name": "bob"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    # FastAPI returns 422 for validation errors, but implementation may raise 400
    detail = response.json().get("detail")
    assert "title" in str(detail).lower()

# Test Case 3: create_task_with_missing_description
def test_create_task_with_missing_description():
    body = {
        "due_date": "2024-07-10",
        "priority": 3,
        "title": "Task without description",
        "user_name": "carol"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 201
    if response.status_code == 201:
        data = response.json()
        assert data["description"] == ""
        assert data["title"] == body["title"]
        assert data["user_name"] == body["user_name"]
        assert "id" in data
    else:
        detail = response.json().get("detail")
        assert "description" in str(detail).lower()

# Test Case 4: create_task_with_invalid_priority_type
def test_create_task_with_invalid_priority_type():
    body = {
        "description": "Invalid priority type.",
        "due_date": "2024-07-15",
        "priority": "high",
        "title": "Priority as string",
        "user_name": "dave"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    detail = response.json().get("detail")
    assert "priority" in str(detail).lower()

# Test Case 5: create_task_with_past_due_date
def test_create_task_with_past_due_date():
    body = {
        "description": "Testing past due date.",
        "due_date": "2023-01-01",
        "priority": 1,
        "title": "Past due date",
        "user_name": "eve"
    }
    response = client.post("/tasks", json=body)
    # No due_date validation in model, so this may succeed unless implemented elsewhere
    assert response.status_code == 201 or response.status_code == 400
    if response.status_code == 400:
        detail = response.json().get("detail")
        assert "due date" in str(detail).lower()

# Test Case 6: create_task_with_empty_title
def test_create_task_with_empty_title():
    body = {
        "description": "Testing empty title.",
        "due_date": "2024-07-20",
        "priority": 2,
        "title": "",
        "user_name": "frank"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    detail = response.json().get("detail")
    assert "title" in str(detail).lower()

# Test Case 7: create_task_with_max_length_title
def test_create_task_with_max_length_title():
    body = {
        "description": "Long title edge case.",
        "due_date": "2024-07-25",
        "priority": 2,
        "title": repeat_str(100),  # Model max_length is 100, not 255
        "user_name": "grace"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == body["title"]
    assert "id" in data

# Test Case 8: create_task_with_title_exceeding_max_length
def test_create_task_with_title_exceeding_max_length():
    body = {
        "description": "Title too long.",
        "due_date": "2024-07-26",
        "priority": 2,
        "title": repeat_str(101),  # Model max_length is 100, not 255
        "user_name": "hannah"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    detail = response.json().get("detail")
    assert "title" in str(detail).lower()

# Test Case 9: create_task_with_missing_user_name
def test_create_task_with_missing_user_name():
    body = {
        "description": "No user_name field.",
        "due_date": "2024-07-30",
        "priority": 1,
        "title": "Missing user"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    detail = response.json().get("detail")
    assert "user_name" in str(detail).lower()

# Test Case 10: create_task_with_invalid_due_date_format
def test_create_task_with_invalid_due_date_format():
    body = {
        "description": "Due date in invalid format.",
        "due_date": "07-31-2024",
        "priority": 2,
        "title": "Invalid date format",
        "user_name": "ian"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    detail = response.json().get("detail")
    assert "due_date" in str(detail).lower()

# Test Case 11: create_task_with_minimum_priority
def test_create_task_with_minimum_priority():
    body = {
        "description": "Testing minimum priority.",
        "due_date": "2024-08-01",
        "priority": 1,
        "title": "Lowest priority task",
        "user_name": "jane"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["priority"] == 1
    assert "id" in data

# Test Case 12: create_task_with_maximum_priority
def test_create_task_with_maximum_priority():
    body = {
        "description": "Testing maximum priority.",
        "due_date": "2024-08-02",
        "priority": 5,
        "title": "Highest priority task",
        "user_name": "kate"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["priority"] == 5
    assert "id" in data

# Test Case 13: create_task_with_priority_above_maximum
def test_create_task_with_priority_above_maximum():
    body = {
        "description": "Priority exceeds allowed maximum.",
        "due_date": "2024-08-03",
        "priority": 6,
        "title": "Priority too high",
        "user_name": "leo"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    detail = response.json().get("detail")
    assert "priority" in str(detail).lower()

# Test Case 14: create_task_with_priority_below_minimum
def test_create_task_with_priority_below_minimum():
    body = {
        "description": "Priority below allowed minimum.",
        "due_date": "2024-08-04",
        "priority": 0,
        "title": "Priority too low",
        "user_name": "maya"
    }
    response = client.post("/tasks", json=body)
    assert response.status_code == 422 or response.status_code == 400
    detail = response.json().get("detail")
    assert "priority" in str(detail).lower()