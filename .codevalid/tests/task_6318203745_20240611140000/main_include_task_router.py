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

def test_create_task_success():
    """Test Case 1: Create Task Success"""
    payload = {
        'description': 'Purchase milk, eggs, and bread',
        'due_date': '2024-07-01',
        'priority': 2,
        'title': 'Buy groceries'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': 'Purchase milk, eggs, and bread',
        'due_date': '2024-07-01',
        'id': 1,
        'priority': 2,
        'status': 'pending',
        'title': 'Buy groceries'
    }

def test_create_task_missing_title():
    """Test Case 2: Create Task Missing Title"""
    payload = {
        'description': 'Read a book',
        'due_date': '2024-07-01',
        'priority': 1
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data == {
        'detail': [
            {'loc': ['body', 'title'], 'msg': 'field required', 'type': 'value_error.missing'}
        ]
    }

def test_create_task_invalid_priority_type():
    """Test Case 3: Create Task Invalid Priority Type"""
    payload = {
        'description': 'Vacuum and dust',
        'due_date': '2024-07-02',
        'priority': 'high',
        'title': 'Clean room'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data == {
        'detail': [
            {'loc': ['body', 'priority'], 'msg': 'value is not a valid integer', 'type': 'type_error.integer'}
        ]
    }

def test_create_task_empty_title():
    """Test Case 4: Create Task Empty Title"""
    payload = {
        'description': 'Walk the dog',
        'due_date': '2024-07-03',
        'priority': 1,
        'title': ''
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data == {
        'detail': [
            {'loc': ['body', 'title'], 'msg': 'title must not be empty', 'type': 'value_error'}
        ]
    }

def test_create_task_title_max_length():
    """Test Case 5: Create Task Title Max Length"""
    max_title = 'T' * 255
    payload = {
        'description': 'Task with long title',
        'due_date': '2024-07-04',
        'priority': 3,
        'title': max_title
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': 'Task with long title',
        'due_date': '2024-07-04',
        'id': 2,
        'priority': 3,
        'status': 'pending',
        'title': max_title
    }

def test_create_task_missing_optional_fields():
    """Test Case 6: Create Task Missing Optional Fields"""
    payload = {
        'title': 'Call mom'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data == {
        'description': None,
        'due_date': None,
        'id': 3,
        'priority': None,
        'status': 'pending',
        'title': 'Call mom'
    }

def test_create_task_invalid_due_date_format():
    """Test Case 7: Create Task Invalid Due Date Format"""
    payload = {
        'description': 'End of month report',
        'due_date': '07-01-2024',
        'priority': 1,
        'title': 'Submit report'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data == {
        'detail': [
            {'loc': ['body', 'due_date'], 'msg': 'due_date must be in YYYY-MM-DD format', 'type': 'value_error'}
        ]
    }

def test_create_task_priority_out_of_bounds():
    """Test Case 8: Create Task Priority Out of Bounds"""
    payload = {
        'description': 'Math exercises',
        'due_date': '2024-07-05',
        'priority': 10,
        'title': 'Finish homework'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data == {
        'detail': [
            {'loc': ['body', 'priority'], 'msg': 'priority must be between 1 and 5', 'type': 'value_error'}
        ]
    }

def test_create_task_duplicate_title():
    """Test Case 9: Create Task Duplicate Title"""
    # First, create the task
    payload = {
        'description': 'Purchase milk, eggs, and bread',
        'due_date': '2024-07-01',
        'priority': 2,
        'title': 'Buy groceries'
    }
    client.post("/tasks", json=payload)
    # Now, try to create duplicate
    payload2 = {
        'description': 'Buy fruit',
        'due_date': '2024-07-06',
        'priority': 1,
        'title': 'Buy groceries'
    }
    response = client.post("/tasks", json=payload2)
    assert response.status_code == 409
    data = response.json()
    assert data == {'detail': 'Task with this title already exists.'}

def test_create_task_no_content_type_header():
    """Test Case 10: Create Task No Content-Type Header"""
    payload = {
        'description': 'Morning run',
        'due_date': '2024-07-07',
        'priority': 2,
        'title': 'Go jogging'
    }
    # Send as data, not json, and omit Content-Type header
    response = client.post("/tasks", data=str(payload))
    assert response.status_code == 415
    data = response.json()
    assert data == {'detail': 'Unsupported Media Type'}