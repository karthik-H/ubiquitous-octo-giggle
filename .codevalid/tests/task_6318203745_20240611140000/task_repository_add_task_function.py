import pytest
from datetime import date
from app.repositories.task_repository import TaskRepository
import logging

@pytest.fixture
def repo():
    return TaskRepository()

def test_add_task_with_minimal_valid_input(repo):
    # Test Case 1
    data = {'description': 'A minimal valid task', 'due_date': '2024-06-30', 'title': 'Sample Task'}
    task = repo.add_task(data)
    assert task['description'] == 'A minimal valid task'
    assert task['due_date'] == '2024-06-30'
    assert task['title'] == 'Sample Task'
    assert isinstance(task['id'], int)
    assert repo._tasks[-1] == task

def test_add_task_with_all_possible_fields(repo):
    # Test Case 2
    data = {'assigned_to': 'user123', 'description': 'Task with all attributes', 'due_date': '2024-07-01', 'priority': 'high', 'title': 'Complete Task'}
    task = repo.add_task(data)
    assert task['assigned_to'] == 'user123'
    assert task['description'] == 'Task with all attributes'
    assert task['due_date'] == '2024-07-01'
    assert task['priority'] == 'high'
    assert task['title'] == 'Complete Task'
    assert isinstance(task['id'], int)
    assert repo._tasks[-1] == task

def test_verify_sequential_id_assignment(repo):
    # Test Case 3
    data1 = {'description': 'First task', 'title': 'Task #1'}
    data2 = {'description': 'Second task', 'title': 'Task #2'}
    t1 = repo.add_task(data1)
    t2 = repo.add_task(data2)
    assert t1['id'] == 1
    assert t2['id'] == 2
    assert t1['title'] == 'Task #1'
    assert t2['title'] == 'Task #2'

def test_add_task_with_empty_title(repo):
    # Test Case 4
    data = {'description': 'No title', 'title': ''}
    result = repo.add_task(data)
    assert result == {'error': 'Title must not be empty'}

def test_add_task_missing_required_field(repo):
    # Test Case 5
    data = {'description': 'Missing title'}
    result = repo.add_task(data)
    assert result == {'error': 'Missing required field: title'}

def test_add_task_with_invalid_due_date_format(repo):
    # Test Case 6
    data = {'due_date': '30-06-2024', 'title': 'Bad Date Task'}
    result = repo.add_task(data)
    assert result == {'error': 'Invalid due_date format'}

def test_add_task_with_duplicate_title(repo):
    # Test Case 7
    data1 = {'description': 'First', 'title': 'Duplicate Task'}
    data2 = {'description': 'Second', 'title': 'Duplicate Task'}
    t1 = repo.add_task(data1)
    t2 = repo.add_task(data2)
    assert t1['title'] == 'Duplicate Task'
    assert t2['title'] == 'Duplicate Task'
    assert isinstance(t1['id'], int)
    assert isinstance(t2['id'], int)
    assert t1['id'] != t2['id']

def test_add_task_with_excessively_long_title(repo):
    # Test Case 8
    long_title = 'T' * 255
    data = {'description': 'Long title test', 'title': long_title}
    task = repo.add_task(data)
    assert task['description'] == 'Long title test'
    assert task['title'] == long_title
    assert isinstance(task['id'], int)

def test_add_task_with_null_fields(repo):
    # Test Case 9
    data = {'description': None, 'title': None}
    result = repo.add_task(data)
    assert result == {'error': 'Null values not allowed for title or description'}

def test_add_task_with_invalid_priority_value(repo):
    # Test Case 10
    data = {'priority': 'extreme', 'title': 'Priority Test'}
    result = repo.add_task(data)
    assert result == {'error': 'Invalid priority value'}

def test_verify_task_is_stored_and_returned(repo):
    # Test Case 11
    data = {'description': 'Should be stored', 'title': 'Store Test'}
    task = repo.add_task(data)
    assert task['description'] == 'Should be stored'
    assert task['title'] == 'Store Test'
    assert isinstance(task['id'], int)
    assert repo._tasks[-1] == task

def test_verify_task_creation_is_logged(repo, caplog):
    # Test Case 12
    data = {'description': 'Check logging', 'title': 'Log Test'}
    with caplog.at_level(logging.INFO):
        task = repo.add_task(data)
        expected_log = f"Task created with ID: {task['id']}, title: Log Test"
        assert expected_log in caplog.text

def test_add_task_with_empty_description(repo):
    # Test Case 13
    data = {'description': '', 'title': 'Empty Description'}
    task = repo.add_task(data)
    assert task['description'] == ''
    assert task['title'] == 'Empty Description'
    assert isinstance(task['id'], int)
