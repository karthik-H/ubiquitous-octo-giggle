import pytest
from unittest.mock import MagicMock
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

# Test Case 1: create_task_with_valid_data
def test_create_task_with_valid_data(service, mock_repository):
    task_create = valid_task_create()
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)

    mock_repository.add_task.assert_called_once_with(task_create)
    assert isinstance(result, Task)
    assert result == expected_task

# Test Case 2: create_task_with_missing_required_field
def test_create_task_with_missing_required_field(service, mock_repository):
    data = valid_task_create().dict()
    data.pop("title")
    with pytest.raises(ValidationError):
        TaskCreate(**data)
    mock_repository.add_task.assert_not_called()

# Test Case 3: create_task_with_empty_title
def test_create_task_with_empty_title(service, mock_repository):
    with pytest.raises(ValidationError):
        task_create = valid_task_create(title="")
        service.create_task(task_create)
    mock_repository.add_task.assert_not_called()

# Test Case 4: create_task_with_maximum_length_title
def test_create_task_with_maximum_length_title(service, mock_repository):
    max_length_title = "T" * 255
    task_create = valid_task_create(title=max_length_title)
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)

    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.title == max_length_title

# Test Case 5: create_task_with_title_exceeding_max_length
def test_create_task_with_title_exceeding_max_length(service, mock_repository):
    too_long_title = "T" * 256
    with pytest.raises(ValidationError):
        valid_task_create(title=too_long_title)
    mock_repository.add_task.assert_not_called()

# Test Case 6: create_task_with_invalid_due_date_format
def test_create_task_with_invalid_due_date_format(service, mock_repository):
    # due_date should be a date object, not a string
    with pytest.raises(ValidationError):
        valid_task_create(due_date="31-12-2022")
    mock_repository.add_task.assert_not_called()

# Test Case 7: create_task_with_past_due_date
def test_create_task_with_past_due_date(service, mock_repository):
    past_due_date = date.today() - timedelta(days=1)
    task_create = valid_task_create(due_date=past_due_date)
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    # Business logic: If allowed, task is created; otherwise, validation should fail.
    # Since no validation in model, it will succeed.
    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.due_date == past_due_date

# Test Case 8: create_task_repository_add_task_raises_exception
def test_create_task_repository_add_task_raises_exception(service, mock_repository):
    task_create = valid_task_create()
    mock_repository.add_task.side_effect = Exception("DatabaseException")

    with pytest.raises(Exception) as excinfo:
        service.create_task(task_create)
    assert "DatabaseException" in str(excinfo.value)
    mock_repository.add_task.assert_called_once_with(task_create)

# Test Case 9: create_task_with_minimal_fields
def test_create_task_with_minimal_fields(service, mock_repository):
    # Assuming title, due_date, and user_name are required, omit optional fields
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

# Test Case 10: create_task_with_null_field_values
def test_create_task_with_null_field_values(service, mock_repository):
    # Optional fields set to None
    task_create = valid_task_create(description=None, priority=None)
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.description is None or result.description == ""
    assert result.priority is None or isinstance(result.priority, int)

# Test Case 11: create_task_with_duplicate_title
def test_create_task_with_duplicate_title(service, mock_repository):
    task_create = valid_task_create(title="Duplicate Task")
    expected_task = valid_task(task_create)
    # Simulate repository allowing duplicate tasks
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert isinstance(result, Task)
    assert result.title == "Duplicate Task"

# Test Case 12: create_task_with_extremely_large_description
def test_create_task_with_extremely_large_description(service, mock_repository):
    large_description = "A" * 10000
    task_create = valid_task_create(description=large_description)
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.description == large_description