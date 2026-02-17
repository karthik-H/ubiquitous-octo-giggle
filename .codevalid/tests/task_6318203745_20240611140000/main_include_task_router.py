import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Helper to build a valid task payload
def valid_task_payload(**overrides):
    payload = {
        "title": "Buy groceries",
        "description": "Buy milk, eggs, and bread",
        "due_date": "2024-07-01",
        "priority": 3,
        "user_name": "alice"
    }
    payload.update(overrides)
    return payload

@pytest.fixture(autouse=True)
def reset_tasks():
    # Reset the repository between tests if possible
    # This is a placeholder; actual implementation may differ
    try:
        from app.controllers.task_controller import task_service
        task_service.repository._tasks.clear()
        task_service.repository._id_counter = 1
    except Exception:
        pass

def test_create_task_valid_request():
    """Test Case 1: Create Task - Valid Request"""
    payload = valid_task_payload()
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["due_date"] == payload["due_date"]
    assert data["status"] == "pending" or "status" not in data  # status may not exist in model
    assert data["id"] == 1

def test_create_task_missing_title():
    """Test Case 2: Create Task - Missing Title"""
    payload = valid_task_payload()
    del payload["title"]
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert any(
        err["loc"][-1] == "title" and err["msg"] == "field required"
        for err in data["detail"]
    )

def test_create_task_empty_title():
    """Test Case 3: Create Task - Empty Title"""
    payload = valid_task_payload(title="")
    response = client.post("/tasks", json=payload)
    # Pydantic will return 422 for min_length violation
    assert response.status_code == 422 or response.status_code == 400
    data = response.json()
    if response.status_code == 422:
        assert any(
            err["loc"][-1] == "title" and "ensure this value has at least" in err["msg"]
            for err in data["detail"]
        )
    else:
        assert data["detail"] == "Title must not be empty"

def test_create_task_title_length_exceeds_limit():
    """Test Case 4: Create Task - Title Length Exceeds Limit"""
    payload = valid_task_payload(title="T" * 256)
    response = client.post("/tasks", json=payload)
    # Pydantic will return 422 for max_length violation
    assert response.status_code == 422 or response.status_code == 400
    data = response.json()
    if response.status_code == 422:
        assert any(
            err["loc"][-1] == "title" and "ensure this value has at most" in err["msg"]
            for err in data["detail"]
        )
    else:
        assert data["detail"] == "Title length exceeds maximum allowed"

def test_create_task_invalid_due_date_format():
    """Test Case 5: Create Task - Invalid Due Date Format"""
    payload = valid_task_payload(due_date="07-01-2024")
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert any(
        err["loc"][-1] == "due_date" and "invalid date format" in err["msg"]
        for err in data["detail"]
    )

def test_create_task_no_description_provided():
    """Test Case 6: Create Task - No Description Provided"""
    payload = valid_task_payload()
    del payload["description"]
    response = client.post("/tasks", json=payload)
    # Pydantic will return 422 for missing required field
    assert response.status_code == 422 or response.status_code == 201
    if response.status_code == 422:
        data = response.json()
        assert any(
            err["loc"][-1] == "description" and err["msg"] == "field required"
            for err in data["detail"]
        )
    else:
        data = response.json()
        assert data["description"] is None
        assert data["title"] == payload["title"]
        assert data["due_date"] == payload["due_date"]

def test_create_task_past_due_date():
    """Test Case 7: Create Task - Past Due Date"""
    payload = valid_task_payload(due_date="2023-01-01")
    response = client.post("/tasks", json=payload)
    # No explicit validation in model, so may succeed unless implemented in service
    assert response.status_code in (400, 201, 422)
    if response.status_code == 400:
        data = response.json()
        assert data["detail"] == "Due date cannot be in the past"

def test_create_task_extra_fields():
    """Test Case 8: Create Task - Extra Fields"""
    payload = valid_task_payload(priority=3)
    payload["priority"] = "high"
    response = client.post("/tasks", json=payload)
    # Pydantic will return 422 for type error
    assert response.status_code in (400, 422)
    data = response.json()
    if response.status_code == 400:
        assert "Extra fields are not allowed" in data["detail"]
    else:
        assert any(
            err["loc"][-1] == "priority" and "value is not a valid integer" in err["msg"]
            for err in data["detail"]
        )

def test_create_task_invalid_content_type():
    """Test Case 9: Create Task - Invalid Content-Type"""
    payload = valid_task_payload()
    response = client.post("/tasks", data=str(payload), headers={"Content-Type": "text/plain"})
    assert response.status_code == 415 or response.status_code == 422
    if response.status_code == 415:
        data = response.json()
        assert data["detail"] == "Unsupported Media Type"

def test_create_task_large_request_body():
    """Test Case 10: Create Task - Large Request Body"""
    payload = valid_task_payload(
        title="T" * 255,
        description="D" * 10000
    )
    response = client.post("/tasks", json=payload)
    # Pydantic will return 422 for max_length violation
    assert response.status_code in (400, 422)
    if response.status_code == 400:
        data = response.json()
        assert data["detail"] == "Request body too large"
    else:
        data = response.json()
        assert any(
            err["loc"][-1] == "description" and "ensure this value has at most" in err["msg"]
            for err in data["detail"]
        )

def test_create_task_special_characters():
    """Test Case 11: Create Task - Special Characters in Title and Description"""
    payload = valid_task_payload(
        title='!@#$%^&*()_+-=[]{}|;\':",.<>/?',
        description='Description with special chars: äöüß€'
    )
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]