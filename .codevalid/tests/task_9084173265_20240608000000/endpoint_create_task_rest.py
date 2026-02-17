import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

# Test Case 1: Create Task with All Valid Fields (Location: Ames)
def test_create_task_with_all_valid_fields_location_ames():
    data = {
        'Description': 'Complete the math assignment before due date',
        'Due_date': '2024-07-01T23:59:00Z',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Finish Assignment',
        'User_name': 'alice123'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

# Test Case 2: Create Task with All Valid Fields (Location: Boone)
def test_create_task_with_all_valid_fields_location_boone():
    data = {
        'Description': 'Get milk and bread from the store',
        'Due_date': '2024-06-15T10:00:00Z',
        'Location': 'Boone',
        'Priority': 2,
        'Title': 'Buy Groceries',
        'User_name': 'bob456'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

# Test Case 3: Create Task with Invalid Location
def test_create_task_with_invalid_location():
    data = {
        'Description': 'Wash and fold clothes',
        'Due_date': '2024-06-20T18:00:00Z',
        'Location': 'Des Moines',
        'Priority': 'Low',
        'Title': 'Do Laundry',
        'User_name': 'charlie789'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 400
    assert response.json() == {'detail': "Location must be either 'Ames' or 'Boone'."}

# Test Case 4: Create Task Missing Title Field
def test_create_task_missing_title_field():
    data = {
        'Description': 'Schedule meeting with team',
        'Due_date': '2024-06-25T09:00:00Z',
        'Location': 'Ames',
        'Priority': 'Medium',
        'User_name': 'diana321'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Title'], 'msg': 'field required', 'type': 'value_error.missing'}]}

# Test Case 5: Create Task Missing Description Field
def test_create_task_missing_description_field():
    data = {
        'Due_date': '2024-06-30T16:00:00Z',
        'Location': 'Boone',
        'Priority': 'High',
        'Title': 'Finish Report',
        'User_name': 'emily555'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Description'], 'msg': 'field required', 'type': 'value_error.missing'}]}

# Test Case 6: Create Task Missing Priority Field
def test_create_task_missing_priority_field():
    data = {
        'Description': 'Daily standup meeting at 9am',
        'Due_date': '2024-06-10T09:00:00Z',
        'Location': 'Ames',
        'Title': 'Team Standup',
        'User_name': 'frank678'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Priority'], 'msg': 'field required', 'type': 'value_error.missing'}]}

# Test Case 7: Create Task Missing Due_date Field
def test_create_task_missing_due_date_field():
    data = {
        'Description': 'Follow up with client about feedback',
        'Location': 'Boone',
        'Priority': 'Medium',
        'Title': 'Call Client',
        'User_name': 'gina333'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Due_date'], 'msg': 'field required', 'type': 'value_error.missing'}]}

# Test Case 8: Create Task Missing User_name Field
def test_create_task_missing_user_name_field():
    data = {
        'Description': 'Backup all important files',
        'Due_date': '2024-07-05T20:00:00Z',
        'Location': 'Ames',
        'Priority': 1,
        'Title': 'Backup Files'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'User_name'], 'msg': 'field required', 'type': 'value_error.missing'}]}

# Test Case 9: Create Task Missing Location Field
def test_create_task_missing_location_field():
    data = {
        'Description': 'Organize desk and shelves',
        'Due_date': '2024-07-10T17:00:00Z',
        'Priority': 'Low',
        'Title': 'Clean Office',
        'User_name': 'harry111'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Location'], 'msg': 'field required', 'type': 'value_error.missing'}]}

# Test Case 10: Create Task Missing Multiple Fields
def test_create_task_missing_multiple_fields():
    data = {
        'Description': 'Test multi-field missing',
        'Priority': 'High'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {
        'detail': [
            {'loc': ['body', 'Title'], 'msg': 'field required', 'type': 'value_error.missing'},
            {'loc': ['body', 'Due_date'], 'msg': 'field required', 'type': 'value_error.missing'},
            {'loc': ['body', 'User_name'], 'msg': 'field required', 'type': 'value_error.missing'},
            {'loc': ['body', 'Location'], 'msg': 'field required', 'type': 'value_error.missing'}
        ]
    }

# Test Case 11: Create Task with Invalid Due_date Format
def test_create_task_with_invalid_due_date_format():
    data = {
        'Description': 'Due date in wrong format',
        'Due_date': '06-12-2024 12:30',
        'Location': 'Ames',
        'Priority': 'Medium',
        'Title': 'Test Invalid Date',
        'User_name': 'ian222'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Due_date'], 'msg': 'invalid datetime format', 'type': 'type_error.datetime'}]}

# Test Case 12: Create Task with Empty String Fields
def test_create_task_with_empty_string_fields():
    data = {
        'Description': '',
        'Due_date': '2024-07-12T08:00:00Z',
        'Location': 'Ames',
        'Priority': 'Low',
        'Title': '',
        'User_name': ''
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {
        'detail': [
            {'loc': ['body', 'Title'], 'msg': 'Title must not be empty', 'type': 'value_error'},
            {'loc': ['body', 'Description'], 'msg': 'Description must not be empty', 'type': 'value_error'},
            {'loc': ['body', 'User_name'], 'msg': 'User_name must not be empty', 'type': 'value_error'}
        ]
    }

# Test Case 13: Create Task with Priority as Both String and Integer
def test_create_task_with_priority_as_string():
    data = {
        'Description': 'Priority as string',
        'Due_date': '2024-07-13T13:00:00Z',
        'Location': 'Boone',
        'Priority': '2',
        'Title': 'Test Priority String',
        'User_name': 'jane999'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

# Test Case 14: Create Task with Priority as Zero
def test_create_task_with_priority_as_zero():
    data = {
        'Description': 'Check handling of zero priority',
        'Due_date': '2024-07-14T09:00:00Z',
        'Location': 'Ames',
        'Priority': 0,
        'Title': 'Zero Priority Task',
        'User_name': 'kate888'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data