import pytest
from unittest.mock import MagicMock
from app.services.task_service import TaskService

@pytest.fixture
def mock_repository():
    repo = MagicMock()
    repo.add_task = MagicMock()
    return repo

@pytest.fixture
def task_service(mock_repository):
    return TaskService(repository=mock_repository)

def repeat(char, count):
    return char * count

# Test Case 1: test_create_task_success_ames
def test_create_task_success_ames(task_service, mock_repository):
    input_data = {
        "Description": "Purchase milk and eggs",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Buy groceries",
        "User_name": "alice"
    }
    expected_response = {
        "Description": "Purchase milk and eggs",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Buy groceries",
        "User_name": "alice"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 2: test_create_task_success_boone
def test_create_task_success_boone(task_service, mock_repository):
    input_data = {
        "Description": "Complete quarterly report",
        "Due_date": "2024-07-10",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Finish report",
        "User_name": "bob"
    }
    expected_response = {
        "Description": "Complete quarterly report",
        "Due_date": "2024-07-10",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Finish report",
        "User_name": "bob"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 3: test_create_task_invalid_location
def test_create_task_invalid_location(task_service):
    input_data = {
        "Description": "Organize desk and files",
        "Due_date": "2024-07-05",
        "Location": "Des Moines",
        "Priority": "Low",
        "Title": "Clean office",
        "User_name": "carol"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Location must be either 'Ames' or 'Boone'."}
    assert status == 400

# Test Case 4: test_create_task_missing_title
def test_create_task_missing_title(task_service):
    input_data = {
        "Description": "Team meeting",
        "Due_date": "2024-07-02",
        "Location": "Ames",
        "Priority": "High",
        "User_name": "dave"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Title"}
    assert status == 400

# Test Case 5: test_create_task_missing_description
def test_create_task_missing_description(task_service):
    input_data = {
        "Due_date": "2024-07-03",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Schedule dentist appointment",
        "User_name": "erin"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Description"}
    assert status == 400

# Test Case 6: test_create_task_missing_priority
def test_create_task_missing_priority(task_service):
    input_data = {
        "Description": "Choose destination and book flights",
        "Due_date": "2024-07-12",
        "Location": "Ames",
        "Title": "Plan vacation",
        "User_name": "frank"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Priority"}
    assert status == 400

# Test Case 7: test_create_task_missing_due_date
def test_create_task_missing_due_date(task_service):
    input_data = {
        "Description": "Electricity and water payments",
        "Location": "Boone",
        "Priority": "High",
        "Title": "Pay bills",
        "User_name": "gina"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Due_date"}
    assert status == 400

# Test Case 8: test_create_task_missing_user_name
def test_create_task_missing_user_name(task_service):
    input_data = {
        "Description": "Monthly magazine",
        "Due_date": "2024-07-20",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "Renew subscription"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: User_name"}
    assert status == 400

# Test Case 9: test_create_task_missing_location
def test_create_task_missing_location(task_service):
    input_data = {
        "Description": "Initial meeting with stakeholders",
        "Due_date": "2024-07-15",
        "Priority": "High",
        "Title": "Project kickoff",
        "User_name": "hannah"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Location"}
    assert status == 400

# Test Case 10: test_create_task_empty_title
def test_create_task_empty_title(task_service):
    input_data = {
        "Description": "Call supplier",
        "Due_date": "2024-07-22",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "",
        "User_name": "ian"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Title cannot be empty"}
    assert status == 400

# Test Case 11: test_create_task_long_title
def test_create_task_long_title(task_service, mock_repository):
    input_data = {
        "Description": "Edge case for maximum title length",
        "Due_date": "2024-07-25",
        "Location": "Boone",
        "Priority": "High",
        "Title": repeat("T", 255),
        "User_name": "julia"
    }
    expected_response = {
        "Description": "Edge case for maximum title length",
        "Due_date": "2024-07-25",
        "Location": "Boone",
        "Priority": "High",
        "Title": repeat("T", 255),
        "User_name": "julia"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 12: test_create_task_invalid_field_type
def test_create_task_invalid_field_type(task_service):
    input_data = {
        "Description": "For June 2024",
        "Due_date": "2024-07-28",
        "Location": "Ames",
        "Priority": 1,
        "Title": "Submit timesheet",
        "User_name": "kate"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Invalid type for field: Priority"}
    assert status == 400

# Test Case 13: test_create_task_extra_fields
def test_create_task_extra_fields(task_service, mock_repository):
    input_data = {
        "Description": "Review pull request #42",
        "Due_date": "2024-07-30",
        "ExtraField": "should be ignored",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Review PR",
        "User_name": "leo"
    }
    expected_response = {
        "Description": "Review pull request #42",
        "Due_date": "2024-07-30",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Review PR",
        "User_name": "leo"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 14: test_create_task_invalid_due_date_format
def test_create_task_invalid_due_date_format(task_service):
    input_data = {
        "Description": "Nightly job",
        "Due_date": "07/31/2024",
        "Location": "Boone",
        "Priority": "High",
        "Title": "Backup database",
        "User_name": "maria"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Invalid date format for Due_date"}
    assert status == 400