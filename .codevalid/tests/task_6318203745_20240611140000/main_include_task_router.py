import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_tasks():
    # Reset the repository between tests if possible
    try:
        from app.controllers.task_controller import task_service
        task_service.repository._tasks.clear()
        task_service.repository._id_counter = 1
    except Exception:
        pass

def test_add_task_success():
    """Test Case 1: Add Task - Success"""
    payload = {
        'description': 'Purchase milk from store',
        'due_date': '2024-07-01',
        'title': 'Buy milk'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': 'Purchase milk from store',
        'due_date': '2024-07-01',
        'id': 1,
        'status': 'pending',
        'title': 'Buy milk'
    }

def test_add_task_missing_title():
    """Test Case 2: Add Task - Missing Title"""
    payload = {
        'description': 'No title provided',
        'due_date': '2024-07-01'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data == {'detail': "Field 'title' is required."}

def test_add_task_empty_title():
    """Test Case 3: Add Task - Empty Title"""
    payload = {
        'description': 'Title is empty',
        'due_date': '2024-07-01',
        'title': ''
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data == {'detail': "Field 'title' cannot be empty."}

def test_add_task_missing_description():
    """Test Case 4: Add Task - Missing Description"""
    payload = {
        'due_date': '2024-07-01',
        'title': 'Do homework'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': None,
        'due_date': '2024-07-01',
        'id': 2,
        'status': 'pending',
        'title': 'Do homework'
    }

def test_add_task_invalid_due_date_format():
    """Test Case 5: Add Task - Invalid Due Date Format"""
    payload = {
        'description': 'Check on mom',
        'due_date': '07-01-2024',
        'title': 'Call mom'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data == {'detail': "Field 'due_date' must be in ISO format (YYYY-MM-DD)."}

def test_add_task_large_title():
    """Test Case 6: Add Task - Large Title"""
    payload = {
        'description': 'Title exceeds maximum length',
        'due_date': '2024-07-01',
        'title': 'T' * 256
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data == {'detail': "Field 'title' exceeds maximum allowed length."}

def test_add_task_title_at_maximum_length():
    """Test Case 7: Add Task - Title at Maximum Length"""
    payload = {
        'description': 'Title is at maximum length',
        'due_date': '2024-07-01',
        'title': 'T' * 255
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': 'Title is at maximum length',
        'due_date': '2024-07-01',
        'id': 3,
        'status': 'pending',
        'title': 'T' * 255
    }

def test_add_task_no_request_body():
    """Test Case 8: Add Task - No Request Body"""
    response = client.post("/tasks", json={})
    assert response.status_code == 400
    data = response.json()
    assert data == {'detail': 'Request body is required.'}

def test_add_task_extra_fields():
    """Test Case 9: Add Task - Extra Fields"""
    payload = {
        'description': 'Workout session',
        'due_date': '2024-07-01',
        'priority': 'high',
        'title': 'Go to gym'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': 'Workout session',
        'due_date': '2024-07-01',
        'id': 4,
        'status': 'pending',
        'title': 'Go to gym'
    }

def test_add_task_duplicate_title():
    """Test Case 10: Add Task - Duplicate Title"""
    # First, create the task
    payload1 = {
        'description': 'Purchase milk from store',
        'due_date': '2024-07-01',
        'title': 'Buy milk'
    }
    client.post("/tasks", json=payload1)
    # Now, try to create duplicate
    payload2 = {
        'description': 'Buy more milk',
        'due_date': '2024-07-02',
        'title': 'Buy milk'
    }
    response = client.post("/tasks", json=payload2)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': 'Buy more milk',
        'due_date': '2024-07-02',
        'id': 5,
        'status': 'pending',
        'title': 'Buy milk'
    }

def test_add_task_invalid_content_type():
    """Test Case 11: Add Task - Invalid Content-Type"""
    payload = {
        'description': 'Wash clothes',
        'due_date': '2024-07-01',
        'title': 'Do laundry'
    }
    # Send as data, not json, and omit Content-Type header
    response = client.post("/tasks", data=str(payload))
    assert response.status_code == 415
    data = response.json()
    assert data == {'detail': "Unsupported Media Type. Content-Type must be 'application/json'."}

def test_post_to_invalid_url():
    """Test Case 12: POST to Invalid URL"""
    payload = {
        'description': 'This should fail',
        'due_date': '2024-07-01',
        'title': 'Invalid endpoint'
    }
    response = client.post("/taskz", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert data == {'detail': 'Not Found'}