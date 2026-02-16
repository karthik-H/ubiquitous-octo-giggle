import pytest
from unittest.mock import MagicMock

from app.services.task_service import TaskService

class DummyRepository:
    def __init__(self, add_task_behavior=None, existing_tasks=None):
        self.add_task_behavior = add_task_behavior
        self.existing_tasks = existing_tasks or []

    def add_task(self, task_data):
        if self.add_task_behavior:
            if isinstance(self.add_task_behavior, Exception):
                raise self.add_task_behavior
            return self.add_task_behavior
        # Simulate duplicate check
        for t in self.existing_tasks:
            if t['title'] == task_data.get('title') and t.get('user_id') == task_data.get('user_id'):
                raise ValueError('Duplicate task')
        # Simulate successful task creation
        return {**task_data, 'id': 'any_valid_id'}

@pytest.fixture
def repository():
    return DummyRepository()

@pytest.fixture
def service(repository):
    return TaskService(repository=repository)

# Test Case 1: create_task_with_valid_data
def test_create_task_with_valid_data(service, caplog):
    task_data = {
        'title': 'Complete assignment',
        'description': 'Finish math homework',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert result['title'] == task_data['title']
    assert result['description'] == task_data['description']
    assert result['due_date'] == task_data['due_date']
    assert result['user_id'] == task_data['user_id']
    assert 'Creating task' in caplog.text

# Test Case 2: create_task_missing_title
def test_create_task_missing_title(service):
    task_data = {
        'description': 'Finish math homework',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'missing required field' in str(excinfo.value)

# Test Case 3: create_task_empty_title
def test_create_task_empty_title(service):
    task_data = {
        'title': '',
        'description': 'Finish math homework',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'invalid title' in str(excinfo.value) or 'task not created' in str(excinfo.value)

# Test Case 4: create_task_with_invalid_due_date_format
def test_create_task_with_invalid_due_date_format(service):
    task_data = {
        'title': 'Invalid Date',
        'description': 'Desc',
        'due_date': '31-12-2024',
        'user_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'invalid date format' in str(excinfo.value)

# Test Case 5: create_task_missing_user_id
def test_create_task_missing_user_id(service):
    task_data = {
        'title': 'Missing User',
        'description': 'Desc',
        'due_date': '2024-06-15'
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'missing user information' in str(excinfo.value)

# Test Case 6: create_task_boundary_title_length
def test_create_task_boundary_title_length(service, caplog):
    task_data = {
        'title': 'T' * 255,
        'description': 'Boundary test',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert result['title'] == task_data['title']
    assert 'Creating task' in caplog.text

# Test Case 7: create_task_special_characters_title
def test_create_task_special_characters_title(service, caplog):
    task_data = {
        'title': '@#$%&*',
        'description': 'Special chars',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert result['title'] == task_data['title']
    assert 'Creating task' in caplog.text

# Test Case 8: create_task_repository_failure
def test_create_task_repository_failure():
    repository = DummyRepository(add_task_behavior=Exception('Repository failure'))
    service = TaskService(repository=repository)
    task_data = {
        'title': 'Valid Title',
        'description': 'Valid Description',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with pytest.raises(Exception) as excinfo:
        service.create_task(task_data)
    assert 'Repository failure' in str(excinfo.value)

# Test Case 9: create_task_with_null_task_data
def test_create_task_with_null_task_data(service):
    task_data = None
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'invalid input' in str(excinfo.value)

# Test Case 10: create_task_with_minimal_fields
def test_create_task_with_minimal_fields(service, caplog):
    task_data = {
        'title': 'Minimal Task',
        'user_id': 1
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert result['title'] == task_data['title']
    assert result['user_id'] == task_data['user_id']
    assert 'Creating task' in caplog.text

# Test Case 11: create_task_with_duplicate_task
def test_create_task_with_duplicate_task():
    existing_task = {
        'title': 'Duplicate Task',
        'description': 'Desc',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    repository = DummyRepository(existing_tasks=[existing_task])
    service = TaskService(repository=repository)
    task_data = {
        'title': 'Duplicate Task',
        'description': 'Desc',
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'duplication' in str(excinfo.value) or 'Duplicate task' in str(excinfo.value)

# Test Case 12: create_task_with_long_description
def test_create_task_with_long_description(service, caplog):
    task_data = {
        'title': 'Long Description Task',
        'description': 'D' * 1024,
        'due_date': '2024-06-15',
        'user_id': 1
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert result['description'] == task_data['description']
    assert 'Creating task' in caplog.text