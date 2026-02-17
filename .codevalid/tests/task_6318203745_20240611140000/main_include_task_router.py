import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_tasks():
    try:
        from app.controllers.task_controller import task_service
        task_service.repository._tasks.clear()
        task_service.repository._id_counter = 1
    except Exception:
        pass

def test_create_task_valid_ames():
    """Test Case 1: Create a task with valid attributes and Location 'Ames'"""
    payload = {
        'Description': 'Purchase milk, eggs, and bread',
        'Due_date': '2024-06-15',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Buy groceries',
        'User_name': 'alice'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data['Description'] == payload['Description']
    assert data['Due_date'] == payload['Due_date']
    assert data['Location'] == payload['Location']
    assert data['Priority'] == payload['Priority']
    assert data['Title'] == payload['Title']
    assert data['User_name'] == payload['User_name']
    assert 'id' in data

def test_create_task_valid_boone():
    """Test Case 2: Create a task with valid attributes and Location 'Boone'"""
    payload = {
        'Description': 'Fix the kitchen faucet',
        'Due_date': '2024-06-20',
        'Location': 'Boone',
        'Priority': 'Medium',
        'Title': 'Call plumber',
        'User_name': 'bob'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data['Description'] == payload['Description']
    assert data['Due_date'] == payload['Due_date']
    assert data['Location'] == payload['Location']
    assert data['Priority'] == payload['Priority']
    assert data['Title'] == payload['Title']
    assert data['User_name'] == payload['User_name']
    assert 'id' in data

def test_create_task_missing_title():
    """Test Case 3: Missing Title attribute"""
    payload = {
        'Description': 'Go for a walk',
        'Due_date': '2024-06-17',
        'Location': 'Ames',
        'Priority': 'Low',
        'User_name': 'charlie'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Missing required attribute: Title'}

def test_create_task_missing_description():
    """Test Case 4: Missing Description attribute"""
    payload = {
        'Due_date': '2024-06-18',
        'Location': 'Boone',
        'Priority': 'Low',
        'Title': 'Read book',
        'User_name': 'diana'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Missing required attribute: Description'}

def test_create_task_missing_priority():
    """Test Case 5: Missing Priority attribute"""
    payload = {
        'Description': 'Organize and clean garage',
        'Due_date': '2024-06-21',
        'Location': 'Ames',
        'Title': 'Clean garage',
        'User_name': 'eve'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Missing required attribute: Priority'}

def test_create_task_missing_due_date():
    """Test Case 6: Missing Due_date attribute"""
    payload = {
        'Description': 'Finish and submit monthly report',
        'Location': 'Boone',
        'Priority': 'High',
        'Title': 'Submit report',
        'User_name': 'frank'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Missing required attribute: Due_date'}

def test_create_task_missing_user_name():
    """Test Case 7: Missing User_name attribute"""
    payload = {
        'Description': 'Pay electricity and water bills',
        'Due_date': '2024-06-22',
        'Location': 'Ames',
        'Priority': 'Medium',
        'Title': 'Pay bills'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Missing required attribute: User_name'}

def test_create_task_missing_location():
    """Test Case 8: Missing Location attribute"""
    payload = {
        'Description': 'Project kickoff meeting',
        'Due_date': '2024-06-23',
        'Priority': 'High',
        'Title': 'Attend meeting',
        'User_name': 'gina'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Missing required attribute: Location'}

def test_create_task_invalid_location():
    """Test Case 9: Invalid Location value"""
    payload = {
        'Description': 'Clean both inside and outside',
        'Due_date': '2024-06-24',
        'Location': 'Des Moines',
        'Priority': 'Low',
        'Title': 'Wash car',
        'User_name': 'henry'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': "Invalid Location: must be 'Ames' or 'Boone'"}

def test_create_task_location_incorrect_casing():
    """Test Case 10: Location with incorrect casing"""
    payload = {
        'Description': 'Order from favorite shop',
        'Due_date': '2024-06-25',
        'Location': 'ames',
        'Priority': 'Medium',
        'Title': 'Order pizza',
        'User_name': 'irene'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': "Invalid Location: must be 'Ames' or 'Boone'"}

def test_create_task_location_trailing_whitespace():
    """Test Case 11: Location with leading/trailing whitespace"""
    payload = {
        'Description': 'Topic: API testing',
        'Due_date': '2024-06-26',
        'Location': 'Ames ',
        'Priority': 'High',
        'Title': 'Write blog post',
        'User_name': 'jack'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': "Invalid Location: must be 'Ames' or 'Boone'"}

def test_create_task_empty_title():
    """Test Case 12: Empty Title value"""
    payload = {
        'Description': 'Test task with empty title',
        'Due_date': '2024-06-27',
        'Location': 'Boone',
        'Priority': 'Low',
        'Title': '',
        'User_name': 'karen'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Title cannot be empty'}

def test_create_task_empty_description():
    """Test Case 13: Empty Description value"""
    payload = {
        'Description': '',
        'Due_date': '2024-06-28',
        'Location': 'Ames',
        'Priority': 'Medium',
        'Title': 'Test empty description',
        'User_name': 'leo'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Description cannot be empty'}

def test_create_task_invalid_due_date_format():
    """Test Case 14: Invalid Due_date format"""
    payload = {
        'Description': 'Due date is not ISO',
        'Due_date': '15-06-2024',
        'Location': 'Boone',
        'Priority': 'High',
        'Title': 'Test invalid due date',
        'User_name': 'maya'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': 'Invalid Due_date format. Expected YYYY-MM-DD'}

def test_create_task_extra_attribute():
    """Test Case 15: Request body contains extra attribute"""
    payload = {
        'Description': 'Has extra field',
        'Due_date': '2024-06-29',
        'Extra': 'should not be here',
        'Location': 'Ames',
        'Priority': 'Low',
        'Title': 'Extra attribute test',
        'User_name': 'nina'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data['Description'] == payload['Description']
    assert data['Due_date'] == payload['Due_date']
    assert data['Location'] == payload['Location']
    assert data['Priority'] == payload['Priority']
    assert data['Title'] == payload['Title']
    assert data['User_name'] == payload['User_name']
    assert 'id' in data

def test_create_task_all_fields_max_length():
    """Test Case 16: All fields at maximum length"""
    max_len = 255
    payload = {
        'Description': 'D' * max_len,
        'Due_date': '2024-06-30',
        'Location': 'Ames',
        'Priority': 'P' * max_len,
        'Title': 'T' * max_len,
        'User_name': 'U' * max_len
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data['Description'] == payload['Description']
    assert data['Due_date'] == payload['Due_date']
    assert data['Location'] == payload['Location']
    assert data['Priority'] == payload['Priority']
    assert data['Title'] == payload['Title']
    assert data['User_name'] == payload['User_name']
    assert 'id' in data

def test_create_task_invalid_priority():
    """Test Case 17: Invalid Priority value"""
    payload = {
        'Description': "Priority is 'Urgent'",
        'Due_date': '2024-07-01',
        'Location': 'Boone',
        'Priority': 'Urgent',
        'Title': 'Invalid priority test',
        'User_name': 'oliver'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {'error': "Invalid Priority value. Expected 'High', 'Medium', or 'Low'"}

def test_create_task_numeric_user_name():
    """Test Case 18: User_name is numeric string"""
    payload = {
        'Description': 'User_name is numeric string',
        'Due_date': '2024-07-02',
        'Location': 'Ames',
        'Priority': 'Low',
        'Title': 'Numeric username test',
        'User_name': '123456'
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data['Description'] == payload['Description']
    assert data['Due_date'] == payload['Due_date']
    assert data['Location'] == payload['Location']
    assert data['Priority'] == payload['Priority']
    assert data['Title'] == payload['Title']
    assert data['User_name'] == payload['User_name']
    assert 'id' in data

def test_create_task_invalid_content_type():
    """Test Case 19: POST with invalid Content-Type header"""
    payload = {
        'Description': 'Content-Type is not application/json',
        'Due_date': '2024-07-03',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Invalid content type',
        'User_name': 'paul'
    }
    # Send as data, not json, and omit Content-Type header
    response = client.post("/tasks", data=str(payload))
    assert response.status_code == 400
    assert response.json() == {'error': 'Content-Type must be application/json'}

def test_create_task_empty_request_body():
    """Test Case 20: POST with empty request body"""
    response = client.post("/tasks", json={})
    assert response.status_code == 400
    assert response.json() == {'error': 'Missing required attributes'}