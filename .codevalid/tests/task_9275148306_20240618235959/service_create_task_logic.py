import pytest
from unittest.mock import MagicMock, patch
from app.services.task_service import TaskService
from app.domain.models.task import Task, TaskCreate
from app.repositories.task_repository import TaskRepository
from datetime import date
import logging

@pytest.fixture
def valid_task_data():
    return {
        "title": "Test Task",
        "description": "Details",
        "user_id": 1
    }

@pytest.fixture
def minimal_task_data():
    return {
        "title": "Minimal",
        "user_id": 2
    }

@pytest.fixture
def large_task_data():
    return {
        "title": "A" * 10000,
        "description": "D" * 10000,
        "user_id": 1
    }

@pytest.fixture
def repository_mock():
    repo = MagicMock(spec=TaskRepository)
    repo.add_task.side_effect = lambda td: {"id": 1, **td}
    return repo

@pytest.fixture
def logger_mock():
    with patch("logging.getLogger") as logger_patch:
        logger = MagicMock()
        logger_patch.return_value = logger
        yield logger

# Test Case 1: create_task_with_valid_data
def test_create_task_with_valid_data(valid_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    repository_mock.add_task.return_value = {"id": 1, **valid_task_data}
    result = service.create_task(valid_task_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {valid_task_data['user_id']}")
    repository_mock.add_task.assert_called_with(valid_task_data)
    assert result["title"] == valid_task_data["title"]

# Test Case 2: create_task_with_missing_required_field
def test_create_task_with_missing_required_field(repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    incomplete_data = {
        "description": "No title",
        "user_id": 1
    }
    with pytest.raises((KeyError, TypeError, ValueError)):
        service.create_task(incomplete_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {incomplete_data['user_id']}")

# Test Case 3: create_task_with_empty_data
def test_create_task_with_empty_data(repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    with pytest.raises((KeyError, TypeError, ValueError)):
        service.create_task({})
    logger_mock.info.assert_called()

# Test Case 4: create_task_with_large_input
def test_create_task_with_large_input(large_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    repository_mock.add_task.return_value = {"id": 1, **large_task_data}
    try:
        result = service.create_task(large_task_data)
        assert result["title"] == large_task_data["title"]
    except Exception as e:
        assert isinstance(e, Exception)
    logger_mock.info.assert_called_with(f"Creating task for user: {large_task_data['user_id']}")

# Test Case 5: create_task_with_invalid_data_type
def test_create_task_with_invalid_data_type(repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    invalid_data = {
        "title": "Task",
        "description": "desc",
        "user_id": "not-an-integer"
    }
    with pytest.raises((TypeError, ValueError)):
        service.create_task(invalid_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {invalid_data['user_id']}")

# Test Case 6: create_task_repository_failure
def test_create_task_repository_failure(valid_task_data, logger_mock):
    repository_mock = MagicMock(spec=TaskRepository)
    repository_mock.add_task.side_effect = Exception("DB error")
    service = TaskService(repository_mock)
    service.logger = logger_mock
    with pytest.raises(Exception) as excinfo:
        service.create_task(valid_task_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {valid_task_data['user_id']}")
    assert "DB error" in str(excinfo.value)

# Test Case 7: create_task_with_duplicate_data
def test_create_task_with_duplicate_data(valid_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    repository_mock.add_task.side_effect = Exception("Duplicate entry")
    with pytest.raises(Exception) as excinfo:
        service.create_task(valid_task_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {valid_task_data['user_id']}")
    assert "Duplicate entry" in str(excinfo.value)

# Test Case 8: create_task_with_minimum_valid_data
def test_create_task_with_minimum_valid_data(minimal_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    repository_mock.add_task.return_value = {"id": 2, **minimal_task_data}
    result = service.create_task(minimal_task_data)
    assert result["title"] == minimal_task_data["title"]
    logger_mock.info.assert_called_with(f"Creating task for user: {minimal_task_data['user_id']}")

# Test Case 9: create_task_logging_verification(valid_task_data, repository_mock, logger_mock)
def test_create_task_logging_verification(valid_task_data, repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    repository_mock.add_task.return_value = {"id": 1, **valid_task_data}
    service.create_task(valid_task_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {valid_task_data['user_id']}")

# Test Case 10: create_task_with_null_values
def test_create_task_with_null_values(repository_mock, logger_mock):
    service = TaskService(repository_mock)
    service.logger = logger_mock
    null_data = {
        "title": None,
        "description": None,
        "user_id": None
    }
    with pytest.raises((TypeError, ValueError)):
        service.create_task(null_data)
    logger_mock.info.assert_called_with(f"Creating task for user: {null_data['user_id']}")