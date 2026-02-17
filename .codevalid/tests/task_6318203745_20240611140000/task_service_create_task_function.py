import pytest
from unittest.mock import MagicMock, patch
from app.services.task_service import TaskService
from app.domain.models.task import TaskCreate, Task
from app.repositories.task_repository import TaskRepository

@pytest.fixture
def mock_repository():
    return MagicMock(spec=TaskRepository)

@pytest.fixture
def service(mock_repository):
    return TaskService(repository=mock_repository)

def make_task_create(data):
    return TaskCreate(
        title=data["Title"],
        description=data["Description"],
        priority={"High": 5, "Medium": 3, "Low": 1}[data["Priority"]],
        due_date=data["Due_date"],
        user_name=data["User_name"]
    )

def make_task(data, id="generated_task_id"):
    return {
        "Description": data["Description"],
        "Due_date": data["Due_date"],
        "Location": data["Location"],
        "Priority": data["Priority"],
        "Title": data["Title"],
        "User_name": data["User_name"],
        "id": id
    }

# Test Case 1: create_task_success_ames
def test_create_task_success_ames(service, mock_repository):
    data = {
        "Description": "Complete the quarterly report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Finish report",
        "User_name": "alice"
    }
    task_create = make_task_create(data)
    expected_task = make_task(data)
    mock_repository.add_task.return_value = expected_task

    with patch("app.services.task_service.logging") as mock_logging:
        result = service.create_task(task_create)
        mock_logging.info.assert_any_call("Creating task for user: %s", task_create.user_name)
        mock_repository.add_task.assert_called_once_with(task_create)
        assert result == expected_task

# Test Case 2: create_task_success_boone
def test_create_task_success_boone(service, mock_repository):
    data = {
        "Description": "Update the homepage banner",
        "Due_date": "2024-07-15",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Update website",
        "User_name": "bob"
    }
    task_create = make_task_create(data)
    expected_task = make_task(data)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result == expected_task

# Test Case 3: create_task_missing_title
def test_create_task_missing_title(service, mock_repository):
    data = {
        "Description": "Task without a title",
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Priority": "Low",
        "User_name": "carol"
    }
    data.pop("Title", None)
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Missing required attribute: Title" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 4: create_task_missing_description
def test_create_task_missing_description(service, mock_repository):
    data = {
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "No description task",
        "User_name": "carol"
    }
    data.pop("Description", None)
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Missing required attribute: Description" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 5: create_task_missing_priority
def test_create_task_missing_priority(service, mock_repository):
    data = {
        "Description": "Task without priority",
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Title": "No priority task",
        "User_name": "carol"
    }
    data.pop("Priority", None)
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Missing required attribute: Priority" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 6: create_task_missing_due_date
def test_create_task_missing_due_date(service, mock_repository):
    data = {
        "Description": "Task without due date",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "No due date task",
        "User_name": "carol"
    }
    data.pop("Due_date", None)
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Missing required attribute: Due_date" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 7: create_task_missing_user_name
def test_create_task_missing_user_name(service, mock_repository):
    data = {
        "Description": "Task without user name",
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Priority": "High",
        "Title": "No user name task"
    }
    data.pop("User_name", None)
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Missing required attribute: User_name" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 8: create_task_missing_location
def test_create_task_missing_location(service, mock_repository):
    data = {
        "Description": "Task without location",
        "Due_date": "2024-07-10",
        "Priority": "High",
        "Title": "No location task",
        "User_name": "carol"
    }
    data.pop("Location", None)
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Missing required attribute: Location" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 9: create_task_invalid_location
def test_create_task_invalid_location(service, mock_repository):
    data = {
        "Description": "Task with wrong location",
        "Due_date": "2024-07-20",
        "Location": "Des Moines",
        "Priority": "Medium",
        "Title": "Invalid location task",
        "User_name": "david"
    }
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Invalid location: must be 'Ames' or 'Boone'" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 10: create_task_location_case_sensitivity
def test_create_task_location_case_sensitivity(service, mock_repository):
    data = {
        "Description": "Location is 'ames' instead of 'Ames'",
        "Due_date": "2024-07-22",
        "Location": "ames",
        "Priority": "Low",
        "Title": "Case sensitivity task",
        "User_name": "erin"
    }
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Invalid location: must be 'Ames' or 'Boone'" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 11: create_task_empty_string_fields
def test_create_task_empty_string_fields(service, mock_repository):
    data = {
        "Description": "",
        "Due_date": "",
        "Location": "",
        "Priority": "",
        "Title": "",
        "User_name": ""
    }
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Missing or empty required attribute(s): Title, Description, Priority, Due_date, User_name, Location" in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 12: create_task_extra_fields
def test_create_task_extra_fields(service, mock_repository):
    data = {
        "Description": "Extra field present",
        "Due_date": "2024-07-28",
        "Irrelevant": "ignore_me",
        "Location": "Ames",
        "Priority": "High",
        "Title": "With extra",
        "User_name": "frank"
    }
    task_create = make_task_create({k: v for k, v in data.items() if k in ["Description", "Due_date", "Location", "Priority", "Title", "User_name"]})
    expected_task = make_task(data)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result == expected_task

# Test Case 13: create_task_boundary_title_length
def test_create_task_boundary_title_length(service, mock_repository):
    max_length_title = "T" * 255
    data = {
        "Description": "Boundary test for title length",
        "Due_date": "2024-07-30",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": max_length_title,
        "User_name": "gina"
    }
    task_create = make_task_create(data)
    expected_task = make_task(data)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result == expected_task

# Test Case 14: create_task_invalid_due_date_format
def test_create_task_invalid_due_date_format(service, mock_repository):
    data = {
        "Description": "Due date is not ISO",
        "Due_date": "07/31/2024",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Invalid date",
        "User_name": "henry"
    }
    with pytest.raises(Exception) as excinfo:
        make_task_create(data)
    assert "Invalid date format for Due_date. Expected YYYY-MM-DD." in str(excinfo.value)
    mock_repository.add_task.assert_not_called()

# Test Case 15: create_task_all_fields_minimum_values
def test_create_task_all_fields_minimum_values(service, mock_repository):
    data = {
        "Description": "B",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "A",
        "User_name": "C"
    }
    task_create = make_task_create(data)
    expected_task = make_task(data)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result == expected_task