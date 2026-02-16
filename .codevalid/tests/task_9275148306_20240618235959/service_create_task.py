import pytest
from unittest.mock import MagicMock, patch

from app.services.task_service import TaskService

class DummyRepository:
    def __init__(self, add_task_behavior=None):
        self.add_task_behavior = add_task_behavior

    def add_task(self, task_data):
        if self.add_task_behavior:
            if isinstance(self.add_task_behavior, Exception):
                raise self.add_task_behavior
            return self.add_task_behavior
        # Simulate successful task creation
        return {'success': True, 'task_id': 'any_valid_id'}

@pytest.fixture
def repository():
    return DummyRepository()

@pytest.fixture
def service(repository):
    return TaskService(repository=repository)

@pytest.mark.parametrize("task_data,expected_log,expected_result", [
    (
        {'description': 'Finish math homework', 'due_date': '2024-06-15', 'title': 'Complete assignment', 'user_name': 'alice'},
        'Creating task for user: alice',
        {'success': True, 'task_id': 'any_valid_id'}
    ),
])
def test_create_task_with_valid_data(service, task_data, expected_log, expected_result, caplog):
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert expected_log in caplog.text
    assert result == expected_result

def test_create_task_missing_user_name(service):
    task_data = {'description': 'Finish math homework', 'due_date': '2024-06-15', 'title': 'Complete assignment'}
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'user_name is required' in str(excinfo.value)

def test_create_task_with_empty_title(service):
    task_data = {'description': 'Finish math homework', 'due_date': '2024-06-15', 'title': '', 'user_name': 'bob'}
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'title cannot be empty' in str(excinfo.value)

def test_create_task_without_due_date(service, caplog):
    task_data = {'description': 'Read chapter 1', 'title': 'Read book', 'user_name': 'carol'}
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert 'Creating task for user: carol' in caplog.text
    assert result['success'] is True
    assert result['task_id'] == 'any_valid_id'

def test_create_task_with_very_long_title(service, caplog):
    task_data = {
        'description': 'A task with a long title',
        'due_date': '2024-06-15',
        'title': 'T' * 255,
        'user_name': 'dave'
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert 'Creating task for user: dave' in caplog.text
    assert result['success'] is True
    assert result['task_id'] == 'any_valid_id'

def test_create_task_with_special_characters(service, caplog):
    task_data = {
        'description': 'Description with symbols: <>{}[]',
        'due_date': '2024-06-15',
        'title': 'Finish!@#$%^&*()',
        'user_name': 'eve!@#'
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert 'Creating task for user: eve!@#' in caplog.text
    assert result['success'] is True
    assert result['task_id'] == 'any_valid_id'

def test_create_task_repository_failure():
    repository = DummyRepository(add_task_behavior=Exception('Database error'))
    service = TaskService(repository=repository)
    task_data = {
        'description': 'Trigger repository error',
        'due_date': '2024-06-15',
        'title': 'Test repository failure',
        'user_name': 'frank'
    }
    with pytest.raises(Exception) as excinfo:
        with patch('app.services.task_service.logger') as mock_logger:
            service.create_task(task_data)
            mock_logger.info.assert_called_with('Creating task for user: frank')
    assert 'Database error' in str(excinfo.value)

def test_create_task_with_null_task_data(service):
    with pytest.raises(TypeError) as excinfo:
        service.create_task(None)
    assert 'task_data cannot be null' in str(excinfo.value)

def test_create_task_with_empty_description(service, caplog):
    task_data = {
        'description': '',
        'due_date': '2024-06-15',
        'title': 'Task with empty description',
        'user_name': 'hannah'
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert 'Creating task for user: hannah' in caplog.text
    assert result['success'] is True
    assert result['task_id'] == 'any_valid_id'

def test_create_task_with_unicode_characters(service, caplog):
    task_data = {
        'description': '数学作业',
        'due_date': '2024-06-15',
        'title': '完成作业',
        'user_name': '李雷'
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert 'Creating task for user: 李雷' in caplog.text
    assert result['success'] is True
    assert result['task_id'] == 'any_valid_id'