import pytest
from unittest.mock import MagicMock, patch

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
            if t['title'] == task_data.get('title') and t.get('assignee_id') == task_data.get('assignee_id'):
                raise ValueError('Duplicate task')
        # Simulate successful task creation
        return {**task_data, 'id': 'any_valid_id'}

@pytest.fixture
def repository():
    return DummyRepository()

@pytest.fixture
def service(repository):
    return TaskService(repository=repository)

# Test Case 1: Create task with valid input
def test_create_task_with_valid_input(service, caplog):
    task_data = {
        'title': 'Complete assignment',
        'description': 'Finish math homework',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    with caplog.at_level('INFO'):
        result = service.create_task(task_data)
    assert result['title'] == task_data['title']
    assert result['description'] == task_data['description']
    assert result['due_date'] == task_data['due_date']
    assert result['assignee_id'] == task_data['assignee_id']
    assert 'Creating task' in caplog.text

# Test Case 2: Create task with missing required field
def test_create_task_with_missing_required_field(service):
    task_data = {
        'description': 'Finish math homework',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'missing required field' in str(excinfo.value)

# Test Case 3: Create task with empty input
def test_create_task_with_empty_input(service):
    task_data = {}
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'missing required fields' in str(excinfo.value)

# Test Case 4: Create task with invalid field types
@pytest.mark.parametrize("field,value", [
    ("title", 123),
    ("assignee_id", "not_a_number"),
    ("due_date", 20240615),
])
def test_create_task_with_invalid_field_types(service, field, value):
    task_data = {
        'title': 'Valid Title',
        'description': 'Valid Description',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    task_data[field] = value
    with pytest.raises(TypeError) as excinfo:
        service.create_task(task_data)
    assert 'invalid data type' in str(excinfo.value)

# Test Case 5: Create task with boundary title length
def test_create_task_with_boundary_title_length(service):
    task_data = {
        'title': 'T' * 255,
        'description': 'Boundary test',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    result = service.create_task(task_data)
    assert result['title'] == task_data['title']

# Test Case 6: Create task with overflow title length
def test_create_task_with_overflow_title_length(service):
    task_data = {
        'title': 'T' * 256,
        'description': 'Overflow test',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'title length exceeded' in str(excinfo.value)

# Test Case 7: Create task with null fields
@pytest.mark.parametrize("field", ["title", "assignee_id", "due_date"])
def test_create_task_with_null_fields(service, field):
    task_data = {
        'title': 'Valid Title',
        'description': 'Valid Description',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    task_data[field] = None
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'required fields cannot be null' in str(excinfo.value)

# Test Case 8: Create task that duplicates existing task
def test_create_task_that_duplicates_existing_task():
    existing_task = {
        'title': 'Duplicate Task',
        'description': 'Desc',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    repository = DummyRepository(existing_tasks=[existing_task])
    service = TaskService(repository=repository)
    task_data = {
        'title': 'Duplicate Task',
        'description': 'Desc',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'duplicate task' in str(excinfo.value)

# Test Case 9: Create task with repository failure
def test_create_task_with_repository_failure():
    repository = DummyRepository(add_task_behavior=Exception('Database error'))
    service = TaskService(repository=repository)
    task_data = {
        'title': 'Valid Title',
        'description': 'Valid Description',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    with pytest.raises(Exception) as excinfo:
        service.create_task(task_data)
    assert 'Database error' in str(excinfo.value)

# Test Case 10: Create task with only minimum required fields
def test_create_task_with_only_minimum_required_fields(service):
    task_data = {
        'title': 'Minimum Task',
        'assignee_id': 1
    }
    result = service.create_task(task_data)
    assert result['title'] == task_data['title']
    assert result['assignee_id'] == task_data['assignee_id']

# Test Case 11: Create task with invalid due date format
def test_create_task_with_invalid_due_date_format(service):
    task_data = {
        'title': 'Invalid Date',
        'description': 'Desc',
        'due_date': '2024/13/01',
        'assignee_id': 1
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'invalid date format' in str(excinfo.value)

# Test Case 12: Verify logging on successful task creation
def test_verify_logging_on_successful_task_creation(service, caplog):
    task_data = {
        'title': 'Log Success',
        'description': 'Desc',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    with caplog.at_level('INFO'):
        service.create_task(task_data)
    assert 'Creating task' in caplog.text
    assert 'Task created successfully' in caplog.text

# Test Case 13: Verify logging on failed task creation
def test_verify_logging_on_failed_task_creation(service, caplog):
    task_data = {
        'description': 'Desc',
        'due_date': '2024-06-15',
        'assignee_id': 1
    }
    with caplog.at_level('INFO'):
        with pytest.raises(ValueError):
            service.create_task(task_data)
    assert 'Creating task' in caplog.text
    assert 'Task creation failed' in caplog.text

# Test Case 14: Create task with non-existent assignee
def test_create_task_with_non_existent_assignee(service):
    task_data = {
        'title': 'Task',
        'description': 'Desc',
        'due_date': '2024-06-15',
        'assignee_id': 9999
    }
    with pytest.raises(ValueError) as excinfo:
        service.create_task(task_data)
    assert 'assignee not found' in str(excinfo.value)