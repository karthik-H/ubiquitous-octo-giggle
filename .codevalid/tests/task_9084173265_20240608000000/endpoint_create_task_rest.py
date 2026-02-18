import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app

client = TestClient(app)

def test_create_task_success_ames():
    data = {
        'Description': 'Complete the quarterly report',
        'Due date': '2024-07-15T10:00:00Z',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Finish report',
        'User_name': 'alice'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

def test_create_task_success_boone():
    data = {
        'Description': 'Schedule team meeting',
        'Due date': '2024-07-22T15:30:00Z',
        'Location': 'Boone',
        'Priority': 2,
        'Title': 'Plan meeting',
        'User_name': 'bob'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

def test_create_task_missing_title():
    data = {
        'Description': 'No title provided',
        'Due date': '2024-07-10T09:00:00Z',
        'Location': 'Ames',
        'Priority': 1,
        'User_name': 'carol'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Title'], 'msg': 'field required', 'type': 'value_error.missing'}]}

def test_create_task_missing_description():
    data = {
        'Due date': '2024-07-11T11:00:00Z',
        'Location': 'Ames',
        'Priority': 'Low',
        'Title': 'Call supplier',
        'User_name': 'dave'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Description'], 'msg': 'field required', 'type': 'value_error.missing'}]}

def test_create_task_missing_priority():
    data = {
        'Description': 'Prepare slides for meeting',
        'Due date': '2024-07-12T13:00:00Z',
        'Location': 'Boone',
        'Title': 'Prep slides',
        'User_name': 'eve'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Priority'], 'msg': 'field required', 'type': 'value_error.missing'}]}

def test_create_task_missing_due_date():
    data = {
        'Description': 'Budget review',
        'Location': 'Ames',
        'Priority': 'Medium',
        'Title': 'Review budget',
        'User_name': 'frank'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Due date'], 'msg': 'field required', 'type': 'value_error.missing'}]}

def test_create_task_missing_user_name():
    data = {
        'Description': 'Sort documents by type',
        'Due date': '2024-07-13T14:00:00Z',
        'Location': 'Boone',
        'Priority': 3,
        'Title': 'Organize files'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'User_name'], 'msg': 'field required', 'type': 'value_error.missing'}]}

def test_create_task_missing_location():
    data = {
        'Description': 'Order office supplies for next month',
        'Due date': '2024-07-14T16:00:00Z',
        'Priority': 'Low',
        'Title': 'Order supplies',
        'User_name': 'grace'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Location'], 'msg': 'field required', 'type': 'value_error.missing'}]}

def test_create_task_invalid_location():
    data = {
        'Description': 'Trying a location outside allowed values',
        'Due date': '2024-07-15T17:00:00Z',
        'Location': 'Des Moines',
        'Priority': 'Medium',
        'Title': 'Invalid location test',
        'User_name': 'henry'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Location'], 'msg': "value is not a valid enumeration member; permitted: 'Ames', 'Boone'", 'type': 'type_error.enum'}]}

def test_create_task_location_case_sensitivity():
    data = {
        'Description': 'Test Location field with lowercase',
        'Due date': '2024-07-16T18:00:00Z',
        'Location': 'ames',
        'Priority': 1,
        'Title': 'Check case sensitivity',
        'User_name': 'ivan'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Location'], 'msg': "value is not a valid enumeration member; permitted: 'Ames', 'Boone'", 'type': 'type_error.enum'}]}

def test_create_task_priority_as_integer():
    data = {
        'Description': 'Priority as integer',
        'Due date': '2024-07-17T19:00:00Z',
        'Location': 'Boone',
        'Priority': 5,
        'Title': 'Edge priority int',
        'User_name': 'jane'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

def test_create_task_priority_as_string_number():
    data = {
        'Description': 'Priority as string number',
        'Due date': '2024-07-18T20:00:00Z',
        'Location': 'Ames',
        'Priority': '3',
        'Title': 'Edge priority string number',
        'User_name': 'kim'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

def test_create_task_invalid_due_date_format():
    data = {
        'Description': 'Wrong date format',
        'Due date': '07-20-2024',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Invalid due date',
        'User_name': 'lisa'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Due date'], 'msg': 'invalid datetime format', 'type': 'value_error.datetime'}]}

def test_create_task_empty_strings():
    data = {
        'Description': '',
        'Due date': '2024-07-19T21:00:00Z',
        'Location': 'Ames',
        'Priority': '',
        'Title': '',
        'User_name': ''
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 200
    assert response.json() == data

def test_create_task_location_with_whitespace():
    data = {
        'Description': 'Location has whitespace',
        'Due date': '2024-07-20T22:00:00Z',
        'Location': ' Ames ',
        'Priority': 'Medium',
        'Title': 'Whitespace location',
        'User_name': 'mike'
    }
    response = client.post("/tasks", json=data)
    assert response.status_code == 422
    assert response.json() == {'detail': [{'loc': ['body', 'Location'], 'msg': "value is not a valid enumeration member; permitted: 'Ames', 'Boone'", 'type': 'type_error.enum'}]}

def test_create_task_additional_unexpected_field():
    data = {
        'Description': 'Payload contains an extra field',
        'Due date': '2024-07-21T23:00:00Z',
        'Extra': 'unexpected',
        'Location': 'Boone',
        'Priority': 'Low',
        'Title': 'Extra field test',
        'User_name': 'nancy'
    }
    response = client.post("/tasks", json=data)
    expected = {
        'Description': 'Payload contains an extra field',
        'Due date': '2024-07-21T23:00:00Z',
        'Location': 'Boone',
        'Priority': 'Low',
        'Title': 'Extra field test',
        'User_name': 'nancy'
    }
    assert response.status_code == 200
    assert response.json() == expected