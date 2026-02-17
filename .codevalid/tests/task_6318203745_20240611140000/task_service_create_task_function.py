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

# Test Case 1: Create task with valid input
def test_create_task_with_valid_input(service, mock_repository):
    task_create = valid_task_create()
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)

    mock_repository.add_task.assert_called_once_with(task_create)
    assert isinstance(result, Task)
    assert result == expected_task

# Test Case 2: Create task with missing title
def test_create_task_with_missing_title(service, mock_repository):
    with pytest.raises(ValidationError):
        task_create = valid_task_create()
        data = task_create.dict()
        data.pop("title")
        TaskCreate(**data)
    mock_repository.add_task.assert_not_called()

# Test Case 3: Create task with empty description
def test_create_task_with_empty_description(service, mock_repository):
    task_create = valid_task_create(description="")
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)

    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.description == ""

# Test Case 4: Create task with maximum length title
def test_create_task_with_maximum_length_title(service, mock_repository):
    max_length_title = "T" * 100
    task_create = valid_task_create(title=max_length_title)
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)

    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.title == max_length_title

# Test Case 5: Create task with title exceeding maximum length
def test_create_task_with_title_exceeding_max_length(service, mock_repository):
    too_long_title = "T" * 101
    with pytest.raises(ValidationError):
        valid_task_create(title=too_long_title)
    mock_repository.add_task.assert_not_called()

# Test Case 6: Create task with due date in the past
def test_create_task_with_due_date_in_past(service, mock_repository):
    past_due_date = date.today() - timedelta(days=1)
    task_create = valid_task_create(due_date=past_due_date)
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    # Business logic: If allowed, task is created; otherwise, validation should fail.
    # Since no validation in model, it will succeed.
    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert result.due_date == past_due_date

# Test Case 7: Repository failure during task creation
def test_repository_failure_during_task_creation(service, mock_repository):
    task_create = valid_task_create()
    mock_repository.add_task.side_effect = Exception("DB error")

    with pytest.raises(Exception) as excinfo:
        service.create_task(task_create)
    assert "DB error" in str(excinfo.value)
    mock_repository.add_task.assert_called_once_with(task_create)

# Test Case 8: Create task with only required fields
def test_create_task_with_only_required_fields(service, mock_repository):
    # All fields are required in TaskCreate, so this is the same as valid input
    task_create = valid_task_create()
    expected_task = valid_task(task_create)
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert isinstance(result, Task)

# Test Case 9: Create task with null input
def test_create_task_with_null_input(service, mock_repository):
    with pytest.raises(TypeError):
        service.create_task(None)
    mock_repository.add_task.assert_not_called()

# Test Case 10: Create duplicate task
def test_create_duplicate_task(service, mock_repository):
    task_create = valid_task_create()
    expected_task = valid_task(task_create)
    # Simulate repository allowing duplicate tasks
    mock_repository.add_task.return_value = expected_task

    result = service.create_task(task_create)
    mock_repository.add_task.assert_called_once_with(task_create)
    assert isinstance(result, Task)