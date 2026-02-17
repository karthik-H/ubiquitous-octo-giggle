import pytest
from unittest.mock import MagicMock, patch
from datetime import date, timedelta
from app.services.task_service import TaskService
from app.domain.models.task import TaskCreate, Task
from app.repositories.task_repository import TaskRepository
from pydantic import ValidationError

@pytest.fixture
def mock_repository():
    return MagicMock(spec=TaskRepository)

@pytest.fixture
def service(mock_repository):
    return TaskService(repository=mock_repository)

def valid_task_create(**overrides):
    data = {
        "title": "Test Task",
        "description": "A test description.",
        "priority": 3,
        "due_date": date.today() + timedelta(days=1),
        "user_name": "testuser"
    }
    data.update(overrides)
    return TaskCreate(**data)

def valid_task(task_create, id=1):
    return Task(id=id, **task_create.dict())

# Test Case 1: test_create_task_with_valid_data
def test_create_task_with_valid_data(service, mock_repository):
    task_create = valid_task_create()
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)

    mock_repository.add_task.assert_called_once_with(task_create)
    assert isinstance(result, Task)
    assert result == expected_task

# Test Case 2: test_create_task_missing_required_field
def test_create_task_missing_required_field(service, mock_repository):
    data = valid_task_create().dict()
    data.pop("title")
    with pytest.raises(ValidationError):
        TaskCreate(**data)
    mock_repository.add_task.assert_not_called()

# Test Case 3: test_create_task_with_empty_title
def test_create_task_with_empty_title(service, mock_repository):
    with pytest.raises(ValidationError):
        task_create = valid_task_create(title="")
        service.create_task(task_create)
    mock_repository.add_task.assert_not_called()

# Test Case 4: test_create_task_duplicate
def test_create_task_duplicate(service, mock_repository):
    task_create = valid_task_create(title="Duplicate Task", due_date=date.today() + timedelta(days=1))
    mock_repository.add_task.side_effect = Exception("IntegrityError")

    with pytest.raises(Exception) as excinfo:
        service.create_task(task_create)
    assert "IntegrityError" in str(excinfo.value)
    mock_repository.add_task.assert_called_once_with(task_create)

# Test Case 5: test_create_task_with_minimal_required_fields
def test_create_task_with_minimal_required_fields(service, mock_repository):
    minimal_data = {
        "title": "Minimal Task",
        "due_date": date.today() + timedelta(days=1),
        "user_name": "minimaluser"
    }
    task_create = TaskCreate(**minimal_data)
    expected_task = Task(id=1, **task_create.dict())
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert isinstance(result, Task)
    assert result.title == "Minimal Task"
    assert result.user_name == "minimaluser"

# Test Case 6: test_create_task_with_max_length_title
def test_create_task_with_max_length_title(service, mock_repository):
    max_length_title = "T" * 255
    task_create = valid_task_create(title=max_length_title)
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)

    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.title == max_length_title

# Test Case 7: test_create_task_with_over_max_length_title
def test_create_task_with_over_max_length_title(service, mock_repository):
    too_long_title = "T" * 256
    with pytest.raises(ValidationError):
        valid_task_create(title=too_long_title)
    mock_repository.add_task.assert_not_called()

# Test Case 8: test_create_task_with_invalid_due_date
def test_create_task_with_invalid_due_date(service, mock_repository):
    # due_date should be a date object, not a string
    with pytest.raises(ValidationError):
        valid_task_create(due_date="31-12-2022")
    mock_repository.add_task.assert_not_called()

    # due_date in the past
    past_due_date = date.today() - timedelta(days=1)
    task_create = valid_task_create(due_date=past_due_date)
    # If business logic rejects past dates, expect exception; otherwise, allow creation.
    # Here, we assume validation error is expected.
    with pytest.raises(ValidationError):
        # If TaskCreate allows past dates, this will not raise; adjust as per business rules.
        service.create_task(task_create)
    mock_repository.add_task.assert_not_called()

# Test Case 9: test_create_task_repository_failure
def test_create_task_repository_failure(service, mock_repository):
    task_create = valid_task_create()
    mock_repository.add_task.side_effect = Exception("DatabaseException")

    with pytest.raises(Exception) as excinfo:
        service.create_task(task_create)
    assert "DatabaseException" in str(excinfo.value)
    mock_repository.add_task.assert_called_once_with(task_create)

# Test Case 10: test_create_task_logs_creation_attempt
def test_create_task_logs_creation_attempt(service, mock_repository):
    task_create = valid_task_create()
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    with patch("app.services.task_service.logging") as mock_logging:
        result = service.create_task(task_create)
        mock_logging.info.assert_any_call("Attempting to create task: %s", task_create)
        mock_repository.add_task.assert_called_once_with(task_create)
        assert result == expected_task