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

# Helper for max length fields
def repeat(char, count):
    return char * count

# Test Case 1: create_task_successful_ames
def test_create_task_successful_ames(task_service, mock_repository):
    input_data = {
        "Description": "Complete the annual report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Finish report",
        "User_name": "alice"
    }
    expected_response = {
        "Description": "Complete the annual report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Finish report",
        "User_name": "alice",
        "message": "Task created successfully"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 2: create_task_successful_boone
def test_create_task_successful_boone(task_service, mock_repository):
    input_data = {
        "Description": "Set up project kickoff",
        "Due_date": "2024-07-10",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Schedule meeting",
        "User_name": "bob"
    }
    expected_response = {
        "Description": "Set up project kickoff",
        "Due_date": "2024-07-10",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Schedule meeting",
        "User_name": "bob",
        "message": "Task created successfully"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 3: missing_title_field
def test_missing_title_field(task_service):
    input_data = {
        "Description": "No title provided",
        "Due_date": "2024-07-12",
        "Location": "Ames",
        "Priority": "Low",
        "User_name": "carol"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Title"}
    assert status == 400

# Test Case 4: missing_description_field
def test_missing_description_field(task_service):
    input_data = {
        "Due_date": "2024-07-13",
        "Location": "Boone",
        "Priority": "Low",
        "Title": "No description",
        "User_name": "dave"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Description"}
    assert status == 400

# Test Case 5: missing_priority_field
def test_missing_priority_field(task_service):
    input_data = {
        "Description": "Priority not set",
        "Due_date": "2024-07-14",
        "Location": "Ames",
        "Title": "Missing priority",
        "User_name": "eve"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Priority"}
    assert status == 400

# Test Case 6: missing_due_date_field
def test_missing_due_date_field(task_service):
    input_data = {
        "Description": "No due date provided",
        "Location": "Boone",
        "Priority": "High",
        "Title": "Missing due date",
        "User_name": "frank"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Due_date"}
    assert status == 400

# Test Case 7: missing_user_name_field
def test_missing_user_name_field(task_service):
    input_data = {
        "Description": "No user name",
        "Due_date": "2024-07-15",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Missing user name"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: User_name"}
    assert status == 400

# Test Case 8: missing_location_field
def test_missing_location_field(task_service):
    input_data = {
        "Description": "Location not provided",
        "Due_date": "2024-07-16",
        "Priority": "Low",
        "Title": "No location",
        "User_name": "gina"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Location"}
    assert status == 400

# Test Case 9: invalid_location_field
def test_invalid_location_field(task_service):
    input_data = {
        "Description": "Location is not Ames or Boone",
        "Due_date": "2024-07-17",
        "Location": "Des Moines",
        "Priority": "High",
        "Title": "Invalid location",
        "User_name": "henry"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Invalid Location. Allowed values: Ames, Boone"}
    assert status == 400

# Test Case 10: location_case_sensitivity
def test_location_case_sensitivity(task_service):
    input_data = {
        "Description": "Testing case sensitivity for location",
        "Due_date": "2024-07-18",
        "Location": "ames",
        "Priority": "Medium",
        "Title": "Case sensitivity test",
        "User_name": "irene"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Invalid Location. Allowed values: Ames, Boone"}
    assert status == 400

# Test Case 11: location_whitespace
def test_location_whitespace(task_service):
    input_data = {
        "Description": "Location field contains whitespace",
        "Due_date": "2024-07-19",
        "Location": " Ames ",
        "Priority": "High",
        "Title": "Whitespace in location",
        "User_name": "jack"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Invalid Location. Allowed values: Ames, Boone"}
    assert status == 400

# Test Case 12: all_fields_max_length
def test_all_fields_max_length(task_service, mock_repository):
    input_data = {
        "Description": repeat("D", 1000),
        "Due_date": "2024-12-31",
        "Location": "Ames",
        "Priority": "High",
        "Title": repeat("T", 255),
        "User_name": repeat("U", 255)
    }
    expected_response = {
        "Description": repeat("D", 1000),
        "Due_date": "2024-12-31",
        "Location": "Ames",
        "Priority": "High",
        "Title": repeat("T", 255),
        "User_name": repeat("U", 255),
        "message": "Task created successfully"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 13: empty_string_fields
def test_empty_string_fields(task_service):
    input_data = {
        "Description": "",
        "Due_date": "",
        "Location": "",
        "Priority": "",
        "Title": "",
        "User_name": ""
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Missing required field: Title"}
    assert status == 400

# Test Case 14: extra_fields_ignored
def test_extra_fields_ignored(task_service, mock_repository):
    input_data = {
        "Description": "This task has extra data",
        "Due_date": "2024-08-01",
        "ExtraField1": "Some value",
        "ExtraField2": 1234,
        "Location": "Boone",
        "Priority": "Low",
        "Title": "Task with extra fields",
        "User_name": "karen"
    }
    expected_response = {
        "Description": "This task has extra data",
        "Due_date": "2024-08-01",
        "Location": "Boone",
        "Priority": "Low",
        "Title": "Task with extra fields",
        "User_name": "karen",
        "message": "Task created successfully"
    }
    mock_repository.add_task.return_value = expected_response
    response, status = task_service.create_task(input_data)
    assert response == expected_response
    assert status == 201

# Test Case 15: due_date_invalid_format
def test_due_date_invalid_format(task_service):
    input_data = {
        "Description": "Due date is invalid",
        "Due_date": "07/20/2024",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Task with bad date",
        "User_name": "linda"
    }
    response, status = task_service.create_task(input_data)
    assert response == {"error": "Invalid Due_date format. Expected YYYY-MM-DD"}
    assert status == 400