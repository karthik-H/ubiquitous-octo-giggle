import pytest
from datetime import date
from pydantic import ValidationError
from app.repositories.task_repository import TaskRepository
from app.domain.models.task import Task, TaskCreate

import logging

class DummyHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records = []
    def emit(self, record):
        self.records.append(record)

@pytest.fixture
def repo_and_logger(monkeypatch):
    repo = TaskRepository()
    handler = DummyHandler()
    repo.logger.handlers = []
    repo.logger.addHandler(handler)
    repo.logger.setLevel(logging.INFO)
    return repo, handler

def make_task_create(data):
    # Fill missing required fields with defaults for positive tests
    defaults = {
        "title": "Default Title",
        "description": "Default Description",
        "priority": 3,
        "due_date": date(2024, 7, 1),
        "user_name": "default_user"
    }
    d = {**defaults, **data}
    return TaskCreate(**d)

def get_last_log(handler):
    if handler.records:
        return handler.records[-1].getMessage()
    return None

def test_add_task_with_valid_data(repo_and_logger):
    repo, handler = repo_and_logger
    task_data = {
        "title": "Write report",
        "description": "Complete the quarterly report",
        "due_date": date(2024, 7, 1),
        "priority": 2,
        "user_name": "alice"
    }
    task = repo.add_task(TaskCreate(**task_data))
    assert len(repo._tasks) == 1
    assert task.id == 1
    assert task.title == "Write report"
    assert task.description == "Complete the quarterly report"
    assert task.due_date == date(2024, 7, 1)
    assert get_last_log(handler) == f"Task created: {task}"

def test_add_task_to_empty_list_assigns_id_1(repo_and_logger):
    repo, _ = repo_and_logger
    task_data = {
        "title": "Initial Task",
        "description": "First entry",
        "due_date": date(2024, 8, 1),
        "priority": 1,
        "user_name": "bob"
    }
    task = repo.add_task(TaskCreate(**task_data))
    assert task.id == 1
    assert task.title == "Initial Task"
    assert task.description == "First entry"
    assert task.due_date == date(2024, 8, 1)

def test_add_multiple_tasks_id_increments(repo_and_logger):
    repo, _ = repo_and_logger
    data1 = {
        "title": "Task 1",
        "description": "Desc 1",
        "due_date": date(2024, 7, 10),
        "priority": 2,
        "user_name": "user1"
    }
    data2 = {
        "title": "Task 2",
        "description": "Desc 2",
        "due_date": date(2024, 7, 11),
        "priority": 3,
        "user_name": "user2"
    }
    task1 = repo.add_task(TaskCreate(**data1))
    task2 = repo.add_task(TaskCreate(**data2))
    assert task1.id == 1
    assert task2.id == 2
    assert task1.title == "Task 1"
    assert task2.title == "Task 2"

def test_add_task_missing_title(repo_and_logger):
    repo, _ = repo_and_logger
    data = {
        # "title" is missing
        "description": "Missing title",
        "due_date": date(2024, 7, 12),
        "priority": 2,
        "user_name": "user"
    }
    with pytest.raises(ValidationError):
        repo.add_task(TaskCreate(**data))
    assert len(repo._tasks) == 0

def test_add_task_invalid_due_date_format(repo_and_logger):
    repo, _ = repo_and_logger
    # due_date as string in wrong format
    data = {
        "title": "Invalid Date",
        "description": "Date is not in YYYY-MM-DD",
        "due_date": "12-07-2024",  # Wrong format
        "priority": 2,
        "user_name": "user"
    }
    with pytest.raises(ValidationError):
        repo.add_task(TaskCreate(**data))
    assert len(repo._tasks) == 0

def test_add_task_with_long_title(repo_and_logger):
    repo, _ = repo_and_logger
    long_title = "T" * 100  # max_length=100 in model
    data = {
        "title": long_title,
        "description": "Long title test",
        "due_date": date(2024, 7, 13),
        "priority": 2,
        "user_name": "user"
    }
    task = repo.add_task(TaskCreate(**data))
    assert task.title == long_title
    assert task.id == 1
    assert task.description == "Long title test"
    assert task.due_date == date(2024, 7, 13)

def test_add_task_with_empty_description(repo_and_logger):
    repo, _ = repo_and_logger
    data = {
        "title": "No Description",
        "description": "",  # Should fail, min_length=1
        "due_date": date(2024, 7, 14),
        "priority": 2,
        "user_name": "user"
    }
    with pytest.raises(ValidationError):
        repo.add_task(TaskCreate(**data))
    assert len(repo._tasks) == 0

def test_add_task_with_null_fields(repo_and_logger):
    repo, _ = repo_and_logger
    data = {
        "title": None,
        "description": "Null title",
        "due_date": date(2024, 7, 15),
        "priority": 2,
        "user_name": "user"
    }
    with pytest.raises(ValidationError):
        repo.add_task(TaskCreate(**data))
    assert len(repo._tasks) == 0

def test_add_task_with_duplicate_title(repo_and_logger):
    repo, _ = repo_and_logger
    data1 = {
        "title": "Duplicate",
        "description": "First instance",
        "due_date": date(2024, 7, 16),
        "priority": 2,
        "user_name": "user"
    }
    data2 = {
        "title": "Duplicate",
        "description": "Second instance",
        "due_date": date(2024, 7, 17),
        "priority": 2,
        "user_name": "user"
    }
    task1 = repo.add_task(TaskCreate(**data1))
    task2 = repo.add_task(TaskCreate(**data2))
    assert task1.id == 1
    assert task2.id == 2
    assert task1.title == "Duplicate"
    assert task2.title == "Duplicate"
    assert task1.description == "First instance"
    assert task2.description == "Second instance"

def test_add_task_logs_creation(repo_and_logger):
    repo, handler = repo_and_logger
    data = {
        "title": "Log Check",
        "description": "Check logging",
        "due_date": date(2024, 7, 18),
        "priority": 2,
        "user_name": "user"
    }
    task = repo.add_task(TaskCreate(**data))
    last_log = get_last_log(handler)
    assert last_log == f"Task created: {task}"