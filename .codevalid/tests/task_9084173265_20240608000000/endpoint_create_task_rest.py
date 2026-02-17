import pytest
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import patch, MagicMock
import json

from app.main import app

client = TestClient(app)

# Helper for max length fields
MAX_LENGTH = 255
MAX_TITLE = "T" * MAX_LENGTH
MAX_DESCRIPTION = "D" * MAX_LENGTH

@pytest.fixture
def valid_task_data():
    return {
        "Description": "Complete the annual financial report.",
        "Due date": "2024-07-01",
        "Priority": "High",
        "Title": "Finish Report",
        "User_name": "jdoe"
    }

# Test Case 1: Create Task Successfully With Valid Data
def test_create_task_successfully_with_valid_data(valid_task_data):
    with patch("app.services.task_service.create_task", return_value=valid_task_data):
        response = client.post("/tasks", json=valid_task_data)
        assert response.status_code == 201
        assert response.json() == valid_task_data

# Test Case 2: Create Task Missing Title
def test_create_task_missing_title(valid_task_data):
    data = valid_task_data.copy()
    data.pop("Title")
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Missing required field: Title"}

# Test Case 3: Create Task Missing Description
def test_create_task_missing_description(valid_task_data):
    data = valid_task_data.copy()
    data.pop("Description")
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Missing required field: Description"}

# Test Case 4: Create Task Missing Priority
def test_create_task_missing_priority(valid_task_data):
    data = valid_task_data.copy()
    data.pop("Priority")
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Missing required field: Priority"}

# Test Case 5: Create Task Missing Due Date
def test_create_task_missing_due_date(valid_task_data):
    data = valid_task_data.copy()
    data.pop("Due date")
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Missing required field: Due date"}

# Test Case 6: Create Task Missing User Name
def test_create_task_missing_user_name(valid_task_data):
    data = valid_task_data.copy()
    data.pop("User_name")
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Missing required field: User_name"}

# Test Case 7: Create Task With Extra Field
def test_create_task_with_extra_field(valid_task_data):
    data = valid_task_data.copy()
    data["Status"] = "Pending"
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Unexpected field: Status"}

# Test Case 8: Create Task With Empty Request Body
def test_create_task_with_empty_request_body():
    response = client.post("/tasks", json={})
    assert response.status_code == 400
    assert response.json() == {"detail": "Request body is empty or missing required fields"}

# Test Case 9: Create Task With Invalid Due Date Format
def test_create_task_with_invalid_due_date_format(valid_task_data):
    data = valid_task_data.copy()
    data["Due date"] = "31-07-2024"  # Invalid format
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid format for field: Due date"}

# Test Case 10: Create Task With Edge Case Priority Value
def test_create_task_with_edge_case_priority_value(valid_task_data):
    data = valid_task_data.copy()
    data["Priority"] = "urgent!!"
    with patch("app.services.task_service.create_task", return_value=data):
        response = client.post("/tasks", json=data)
        assert response.status_code == 201
        assert response.json() == data

# Test Case 11: Create Task With Maximum Length Title and Description
def test_create_task_with_maximum_length_title_and_description(valid_task_data):
    data = valid_task_data.copy()
    data["Title"] = MAX_TITLE
    data["Description"] = MAX_DESCRIPTION
    with patch("app.services.task_service.create_task", return_value=data):
        response = client.post("/tasks", json=data)
        assert response.status_code == 201
        assert response.json() == data

# Test Case 12: Send GET Request to Task Creation Endpoint
def test_send_get_request_to_task_creation_endpoint():
    response = client.get("/tasks")
    assert response.status_code == 405
    assert response.json() == {"detail": "Method Not Allowed"}

# Test Case 13: Create Task With Null Fields
def test_create_task_with_null_fields():
    data = {
        "Description": None,
        "Due date": None,
        "Priority": None,
        "Title": None,
        "User_name": None
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {"detail": "Fields cannot be null: Title, Description, Priority, Due date, User_name"}

# Test Case 14: Create Task With Non-JSON Body
def test_create_task_with_non_json_body():
    response = client.post("/tasks", data="Not a JSON object", headers={"Content-Type": "text/plain"})
    assert response.status_code == 400
    assert response.json() == {"detail": "Request body must be a valid JSON object"}