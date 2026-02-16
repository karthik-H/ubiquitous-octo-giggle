import pytest
from unittest.mock import MagicMock, patch
from app.services.task_service import TaskService

class DummyRepository:
    def __init__(self, state=None):
        self.state = state
        self.add_task_called = False
        self.last_task_data = None

    def add_task(self, task_data):
        self.add_task_called = True
        self.last_task_data = task_data
        if self.state == 'will_raise_database_error':
            raise Exception('DatabaseError: Unable to persist task')
        if self.state == 'task_with_same_title_exists_for_user':
            raise Exception('ConflictError: Task with this title already exists for user')
        # Simulate task creation
        task = {
            'id': 'generated_task_id',
            'title': task_data.get('title'),
            'description': task_data.get('description', None),
            'due_date': task_data.get('due_date', None),
            'created_by': task_data.get('created_by', None)
        }
        return task

@pytest.fixture
def repository(request):
    state = getattr(request, 'param', None)
    return DummyRepository(state=state)

@pytest.fixture
def task_service(repository):
    return TaskService(repository)

def patch_logger():
    return patch('app.services.task_service.print')

# Test Case 1: create_task_successful
def test_create_task_successful():
    repo = DummyRepository(state='empty')
    service = TaskService(repo)
    task_data = {
        'description': 'This is a test task.',
        'due_date': '2024-07-01',
        'title': 'Test Task'
    }
    user_name = 'alice'
    with patch_logger() as mock_print:
        result = service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert repo.add_task_called
    assert repo.last_task_data == task_data
    assert result == {
        'id': 'generated_task_id',
        'title': 'Test Task',
        'description': 'This is a test task.',
        'due_date': '2024-07-01',
        'created_by': 'alice'
    }

# Test Case 2: create_task_missing_title
def test_create_task_missing_title():
    repo = DummyRepository()
    service = TaskService(repo)
    task_data = {
        'description': 'No title here.',
        'due_date': '2024-07-01'
    }
    user_name = 'bob'
    with patch_logger() as mock_print:
        with pytest.raises(Exception) as exc:
            service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert "ValidationError: 'title' is required" in str(exc.value)
    assert not repo.add_task_called

# Test Case 3: create_task_null_user_name
def test_create_task_null_user_name():
    repo = DummyRepository()
    service = TaskService(repo)
    task_data = {
        'description': 'No user.',
        'due_date': '2024-07-01',
        'title': 'Orphan Task'
    }
    user_name = None
    with patch_logger() as mock_print:
        with pytest.raises(Exception) as exc:
            service.create_task(task_data, user_name)
        mock_print.assert_not_called()
    assert "ValidationError: 'user_name' is required" in str(exc.value)
    assert not repo.add_task_called

# Test Case 4: create_task_repository_error
def test_create_task_repository_error():
    repo = DummyRepository(state='will_raise_database_error')
    service = TaskService(repo)
    task_data = {
        'description': 'Should trigger repository error.',
        'due_date': '2024-07-01',
        'title': 'Persist Fail'
    }
    user_name = 'charlie'
    with patch_logger() as mock_print:
        with pytest.raises(Exception) as exc:
            service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert "DatabaseError: Unable to persist task" in str(exc.value)
    assert repo.add_task_called
    assert repo.last_task_data == task_data

# Test Case 5: create_task_empty_description
def test_create_task_empty_description():
    repo = DummyRepository()
    service = TaskService(repo)
    task_data = {
        'description': '',
        'due_date': '2024-07-01',
        'title': 'No Description'
    }
    user_name = 'dana'
    with patch_logger() as mock_print:
        result = service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert repo.add_task_called
    assert repo.last_task_data == task_data
    assert result == {
        'id': 'generated_task_id',
        'title': 'No Description',
        'description': '',
        'due_date': '2024-07-01',
        'created_by': 'dana'
    }

# Test Case 6: create_task_large_title
def test_create_task_large_title():
    repo = DummyRepository()
    service = TaskService(repo)
    large_title = 'T' * 255
    task_data = {
        'description': 'Boundary test on title length.',
        'due_date': '2024-07-01',
        'title': large_title
    }
    user_name = 'eve'
    with patch_logger() as mock_print:
        result = service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert repo.add_task_called
    assert repo.last_task_data == task_data
    assert result == {
        'id': 'generated_task_id',
        'title': large_title,
        'description': 'Boundary test on title length.',
        'due_date': '2024-07-01',
        'created_by': 'eve'
    }

# Test Case 7: create_task_invalid_due_date_format
def test_create_task_invalid_due_date_format():
    repo = DummyRepository()
    service = TaskService(repo)
    task_data = {
        'description': 'Due date not a date.',
        'due_date': '32-2024-07',
        'title': 'Bad Due Date'
    }
    user_name = 'frank'
    with patch_logger() as mock_print:
        with pytest.raises(Exception) as exc:
            service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert "ValidationError: 'due_date' must be in YYYY-MM-DD format" in str(exc.value)
    assert not repo.add_task_called

# Test Case 8: create_task_duplicate_title_for_user
def test_create_task_duplicate_title_for_user():
    repo = DummyRepository(state='task_with_same_title_exists_for_user')
    service = TaskService(repo)
    task_data = {
        'description': 'Trying to add a duplicate title.',
        'due_date': '2024-07-01',
        'title': 'Duplicate Task'
    }
    user_name = 'grace'
    with patch_logger() as mock_print:
        with pytest.raises(Exception) as exc:
            service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert "ConflictError: Task with this title already exists for user" in str(exc.value)
    assert repo.add_task_called
    assert repo.last_task_data == task_data

# Test Case 9: create_task_minimal_valid_data
def test_create_task_minimal_valid_data():
    repo = DummyRepository()
    service = TaskService(repo)
    task_data = {
        'title': 'Minimal Task'
    }
    user_name = 'heidi'
    with patch_logger() as mock_print:
        result = service.create_task(task_data, user_name)
        mock_print.assert_called_with(f"Creating task for user: {user_name}")
    assert repo.add_task_called
    assert repo.last_task_data == task_data
    assert result == {
        'id': 'generated_task_id',
        'title': 'Minimal Task',
        'description': None,
        'due_date': None,
        'created_by': 'heidi'
    }