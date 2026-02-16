import pytest
from unittest.mock import MagicMock, patch
from app.services.task_service import TaskService
from app.domain.models.task import TaskCreate, Task
from app.repositories.task_repository import TaskRepository
from datetime import date

@pytest.fixture
def valid_task_data():
    return TaskCreate(
        title="Test Task",
        description="A test task description.",
        priority=3,
        due_date=date(2026, 2, 20),
        user_name="testuser"
    )

@pytest.fixture
def minimal_task_data():
    return TaskCreate(
        title="Minimal",
        description="Minimal desc",
        priority=1,
        due_date=date(2026, 2, 20),
        user_name="user"
    )

@pytest.fixture
def repository_mock():
    repo = MagicMock(spec=TaskRepository)
    repo.add_task.side_effect = lambda td: Task(id=1, **td.dict())
    return repo

@pytest.fixture
def logger_mock():
    with patch("logging.getLogger") as logger_patch:
        logger = MagicMock()
        logger_patch.return_value = logger
        yield logger

# Test Case 1: test_create_task_with_valid_data
def test_create_task_with_valid_data(valid_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    result = service.create_task(valid_task_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {valid_task_data.user_name}")
    repository_mock.add_task.assert_called_with(valid_task_data)
    assert isinstance(result, Task)
    assert result.title == valid_task_data.title

# Test Case 2: test_create_task_missing_title
def test_create_task_missing_title(repository_mock, logger_mock):
    invalid_data = {
        "description": "Missing title",
        "priority": 2,
        "due_date": date(2026, 2, 20),
        "user_name": "user"
    }
    with pytest.raises(TypeError):
        TaskCreate(**invalid_data)
    # If TaskCreate is somehow bypassed, service should not be called

# Test Case 3: test_create_task_empty_task_data(repository_mock, logger_mock):
def test_create_task_empty_task_data(repository_mock, logger_mock):
    with pytest.raises(TypeError):
        TaskCreate()
    # If TaskCreate is somehow bypassed, service should not be called

# Test Case 4: test_create_task_null_task_data
def test_create_task_null_task_data(repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    with pytest.raises(TypeError):
        service.create_task(None)

# Test Case 5: test_create_task_with_extra_fields
def test_create_task_with_extra_fields(repository_mock, logger_mock):
    extra_data = {
        "title": "Extra",
        "description": "Has extra fields",
        "priority": 2,
        "due_date": date(2026, 2, 20),
        "user_name": "user",
        "extra_field": "should be ignored"
    }
    # TaskCreate will raise error for extra fields
    with pytest.raises(TypeError):
        TaskCreate(**extra_data)

# Test Case 6: test_create_task_repository_failure
def test_create_task_repository_failure(valid_task_data, logger_mock):
    repository_mock = MagicMock(spec=TaskRepository)
    repository_mock.add_task.side_effect = Exception("DB error")
    service = TaskService(repository_mock)
    service.logger = logger_mock
    with pytest.raises(Exception) as excinfo:
        service.create_task(valid_task_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {valid_task_data.user_name}")
    assert "DB error" in str(excinfo.value)

# Test Case 7: test_create_task_logs_creation_attempt
def test_create_task_logs_creation_attempt(valid_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    service.create_task(valid_task_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {valid_task_data.user_name}")

# Test Case 8: test_create_task_with_minimal_required_fields
def test_create_task_with_minimal_required_fields(minimal_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    result = service.create_task(minimal_task_data)
    assert isinstance(result, Task)
    assert result.title == minimal_task_data.title

# Test Case 9: test_create_task_with_long_title
def test_create_task_with_long_title(repository_mock, logger_mock):
    long_title = "A" * 100
    task_data = TaskCreate(
        title=long_title,
        description="desc",
        priority=2,
        due_date=date(2026, 2, 20),
        user_name="user"
    )
    service = TaskService(repository_mock)
    service.logger = logger_mock
    result = service.create_task(task_data)
    assert result.title == long_title

# Test Case 10: test_create_task_with_special_characters
def test_create_task_with_special_characters(repository_mock, logger_mock):
    special_title = "Tâsk 🚀"
    special_desc = "Descrïption with $pec!al charácters"
    task_data = TaskCreate(
        title=special_title,
        description=special_desc,
        priority=2,
        due_date=date(2026, 2, 20),
        user_name="user"
    )
    service = TaskService(repository_mock)
    service.logger = logger_mock
    result = service.create_task(task_data)
    assert result.title == special_title
    assert result.description == special_desc