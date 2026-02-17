import pytest
from datetime import date
from pydantic import ValidationError
from app.repositories.task_repository import TaskRepository
from app.domain.models.task import TaskCreate, Task

import logging

@pytest.fixture
def repo():
    # Use a fresh repository for each test
    return TaskRepository()

def make_task_create(data):
    # Helper to fill missing fields with defaults for TaskCreate
    defaults = {
        "title": "Default Title",
        "description": "Default Description",
        "priority": 3,
        "due_date": date(2099, 1, 1),
        "user_name": "default_user"
    }
    defaults.update(data)
    return TaskCreate(**defaults)

def test_add_task_basic_success(repo):
    # Test Case 1: Add Task - Basic Success
    data = {
        "title": "Complete assignment",
        "description": "Finish math homework",
        "priority": 2,
        "due_date": date(2024, 7, 1),
        "user_name": "alice"
    }
    task = repo.add_task(TaskCreate(**data))
    assert task.id == 1
    assert task.title == data["title"]
    assert task.description == data["description"]
    assert task.due_date == data["due_date"]
    assert task.priority == data["priority"]
    assert task.user_name == data["user_name"]
    # Ensure it's stored
    assert repo.list_tasks()[0].id == 1

def test_add_task_multiple_tasks_unique_ids(repo):
    # Test Case 2: Add Task - Multiple Tasks Unique IDs
    data1 = {
        "title": "Task 1",
        "description": "Desc 1",
        "priority": 1,
        "due_date": date(2024, 7, 2),
        "user_name": "bob"
    }
    data2 = {
        "title": "Task 2",
        "description": "Desc 2",
        "priority": 2,
        "due_date": date(2024, 7, 3),
        "user_name": "bob"
    }
    t1 = repo.add_task(TaskCreate(**data1))
    t2 = repo.add_task(TaskCreate(**data2))
    assert t1.id == 1
    assert t2.id == 2
    assert t1.title == "Task 1"
    assert t2.title == "Task 2"

def test_add_task_missing_required_fields(repo):
    # Test Case 3: Add Task - Missing Required Fields
    data = {
        "description": "No title provided",
        "priority": 2,
        "due_date": date(2024, 7, 4),
        "user_name": "bob"
    }
    with pytest.raises(ValidationError) as excinfo:
        TaskCreate(**data)
    assert "title" in str(excinfo.value)

def test_add_task_invalid_due_date_format(repo):
    # Test Case 4: Add Task - Invalid Due Date Format
    data = {
        "title": "Invalid date test",
        "description": "Testing date format",
        "priority": 2,
        "due_date": "07/04/2024",  # Wrong format
        "user_name": "bob"
    }
    with pytest.raises(ValidationError) as excinfo:
        TaskCreate(**data)
    assert "due_date" in str(excinfo.value)

def test_add_task_empty_title(repo):
    # Test Case 5: Add Task - Empty Title
    data = {
        "title": "",
        "description": "Empty title test",
        "priority": 2,
        "due_date": date(2024, 7, 5),
        "user_name": "bob"
    }
    with pytest.raises(ValidationError) as excinfo:
        TaskCreate(**data)
    assert "title" in str(excinfo.value)

def test_add_task_long_title(repo):
    # Test Case 6: Add Task - Long Title
    long_title = "T" * 100  # max_length=100 in model
    data = {
        "title": long_title,
        "description": "Long title test",
        "priority": 2,
        "due_date": date(2024, 7, 6),
        "user_name": "bob"
    }
    task = repo.add_task(TaskCreate(**data))
    assert task.title == long_title
    assert task.id == 1

def test_add_task_special_characters_in_fields(repo):
    # Test Case 7: Add Task - Special Characters in Fields
    data = {
        "title": "Write report! @ # $ %",
        "description": "Include all symbols: ~`!@#$%^&*()_+",
        "priority": 2,
        "due_date": date(2024, 7, 7),
        "user_name": "bob"
    }
    task = repo.add_task(TaskCreate(**data))
    assert task.title == data["title"]
    assert task.description == data["description"]
    assert task.id == 1

def test_add_task_priority_missing(repo):
    # Test Case 8: Add Task - Priority Missing
    data = {
        "title": "No priority task",
        "description": "Task without priority",
        "due_date": date(2024, 7, 8),
        "user_name": "bob"
    }
    # priority is required in model, so this should fail
    with pytest.raises(ValidationError) as excinfo:
        TaskCreate(**data)
    assert "priority" in str(excinfo.value)

def test_add_task_invalid_priority_value(repo):
    # Test Case 9: Add Task - Invalid Priority Value
    data = {
        "title": "Invalid priority",
        "description": "Priority not recognized",
        "priority": 10,  # out of allowed range
        "due_date": date(2024, 7, 9),
        "user_name": "bob"
    }
    with pytest.raises(ValidationError) as excinfo:
        TaskCreate(**data)
    assert "priority" in str(excinfo.value)

def test_add_task_duplicate_title(repo):
    # Test Case 10: Add Task - Duplicate Title
    data1 = {
        "title": "Duplicate",
        "description": "First entry",
        "priority": 2,
        "due_date": date(2024, 7, 10),
        "user_name": "bob"
    }
    data2 = {
        "title": "Duplicate",
        "description": "Second entry",
        "priority": 2,
        "due_date": date(2024, 7, 11),
        "user_name": "bob"
    }
    t1 = repo.add_task(TaskCreate(**data1))
    t2 = repo.add_task(TaskCreate(**data2))
    assert t1.title == t2.title == "Duplicate"
    assert t1.id == 1
    assert t2.id == 2

def test_add_task_id_increment_after_failure(repo):
    # Test Case 11: Add Task - ID Increment After Failure
    valid1 = {
        "title": "Valid Task",
        "description": "Valid entry",
        "priority": 2,
        "due_date": date(2024, 7, 12),
        "user_name": "bob"
    }
    invalid = {
        "description": "Missing title",
        "priority": 2,
        "due_date": date(2024, 7, 13),
        "user_name": "bob"
    }
    valid2 = {
        "title": "Second Valid Task",
        "description": "Valid entry",
        "priority": 2,
        "due_date": date(2024, 7, 14),
        "user_name": "bob"
    }
    t1 = repo.add_task(TaskCreate(**valid1))
    assert t1.id == 1
    with pytest.raises(ValidationError):
        TaskCreate(**invalid)
    t2 = repo.add_task(TaskCreate(**valid2))
    assert t2.id == 2

def test_add_task_log_creation(repo, caplog):
    # Test Case 12: Add Task - Log Creation
    data = {
        "title": "Log test",
        "description": "Ensure logging",
        "priority": 2,
        "due_date": date(2024, 7, 15),
        "user_name": "bob"
    }
    with caplog.at_level(logging.INFO, logger="TaskRepository"):
        task = repo.add_task(TaskCreate(**data))
        # The log message should contain the task id and title
        assert f"Task created: {task}" in caplog.text or f"Task created: id={task.id}" in caplog.text
