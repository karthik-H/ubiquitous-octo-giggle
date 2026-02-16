import pytest
from app.repositories.task_repository import TaskRepository
from app.domain.models.task import Task, TaskCreate
from datetime import date
from pydantic import ValidationError
import logging

@pytest.fixture
def repo():
    return TaskRepository()

@pytest.fixture(autouse=True)
def caplog_info_level(caplog):
    caplog.set_level(logging.INFO)
    return caplog

def make_task_data(**kwargs):
    defaults = {
        "title": "Default Title",
        "description": "Default Description",
        "priority": 1,
        "due_date": date(2024, 7, 1),
        "user_name": "default_user"
    }
    defaults.update(kwargs)
    return defaults

def test_add_task_with_minimal_valid_data(repo, caplog_info_level):
    task_data = {
        "description": "Buy a carton of milk",
        "due_date": date(2024, 7, 1),
        "priority": 1,
        "title": "Buy milk",
        "user_name": "alice"
    }
    task_create = TaskCreate(**task_data)
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    task = repo.add_task(task_create)
    assert task.id == prev_id
    assert task.title == "Buy milk"
    assert task.description == "Buy a carton of milk"
    assert task.priority == 1
    assert task.due_date == date(2024, 7, 1)
    assert task.user_name == "alice"
    assert repo._id_counter == prev_id + 1
    assert len(repo._tasks) == prev_len + 1
    assert f"Task created: {task}" in caplog_info_level.text

def test_add_task_with_max_length_fields(repo):
    T = "A"
    task_data = {
        "description": T * 1000,
        "due_date": date(2099, 12, 31),
        "priority": 5,
        "title": T * 100,
        "user_name": T * 50
    }
    task_create = TaskCreate(**task_data)
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    task = repo.add_task(task_create)
    assert task.id == prev_id
    assert task.title == T * 100
    assert task.description == T * 1000
    assert task.priority == 5
    assert task.due_date == date(2099, 12, 31)
    assert task.user_name == T * 50
    assert repo._id_counter == prev_id + 1
    assert len(repo._tasks) == prev_len + 1

def test_add_multiple_tasks_id_increment(repo):
    task_data_list = [
        {"description": "First task", "due_date": date(2024, 7, 1), "priority": 1, "title": "Task 1", "user_name": "bob"},
        {"description": "Second task", "due_date": date(2024, 7, 2), "priority": 2, "title": "Task 2", "user_name": "bob"}
    ]
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    tasks = []
    for data in task_data_list:
        task_create = TaskCreate(**data)
        task = repo.add_task(task_create)
        tasks.append(task)
    assert repo._id_counter == prev_id + 2
    assert len(repo._tasks) == prev_len + 2
    assert tasks[0].id == prev_id
    assert tasks[1].id == prev_id + 1
    assert tasks[0].title == "Task 1"
    assert tasks[1].title == "Task 2"

def test_add_task_missing_title(repo):
    task_data = {
        "description": "No title",
        "due_date": date(2024, 7, 10),
        "priority": 2,
        "user_name": "eve"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_task_missing_description(repo):
    task_data = {
        "due_date": date(2024, 7, 11),
        "priority": 3,
        "title": "No description",
        "user_name": "frank"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    # description is required, so ValidationError expected
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_task_with_negative_priority(repo):
    task_data = {
        "description": "Invalid priority",
        "due_date": date(2024, 7, 12),
        "priority": -1,
        "title": "Negative priority",
        "user_name": "greg"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_task_with_invalid_due_date_format(repo):
    task_data = {
        "description": "Date is not in YYYY-MM-DD",
        "due_date": "07-13-2024",  # invalid format
        "priority": 2,
        "title": "Invalid date",
        "user_name": "hank"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_duplicate_task_data(repo):
    task_data = {
        "description": "Same data",
        "due_date": date(2024, 7, 14),
        "priority": 2,
        "title": "Duplicate",
        "user_name": "iris"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    task_create1 = TaskCreate(**task_data)
    task1 = repo.add_task(task_create1)
    task_create2 = TaskCreate(**task_data)
    task2 = repo.add_task(task_create2)
    assert repo._id_counter == prev_id + 2
    assert len(repo._tasks) == prev_len + 2
    assert task1.id == prev_id
    assert task2.id == prev_id + 1
    assert task1.title == "Duplicate"
    assert task2.title == "Duplicate"

def test_add_task_with_empty_strings(repo):
    task_data = {
        "description": "",
        "due_date": date(2024, 7, 15),
        "priority": 1,
        "title": "",
        "user_name": ""
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_task_with_large_priority(repo):
    task_data = {
        "description": "Test large priority",
        "due_date": date(2024, 7, 16),
        "priority": 2147483647,
        "title": "Max priority",
        "user_name": "jill"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_task_with_string_priority(repo):
    task_data = {
        "description": "Priority is a string",
        "due_date": date(2024, 7, 17),
        "priority": "high",
        "title": "String priority",
        "user_name": "kate"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_task_with_null_fields(repo):
    task_data = {
        "description": None,
        "due_date": None,
        "priority": None,
        "title": None,
        "user_name": None
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    with pytest.raises(ValidationError):
        TaskCreate(**task_data)
    assert repo._id_counter == prev_id
    assert len(repo._tasks) == prev_len

def test_add_task_with_unicode_characters(repo):
    task_data = {
        "description": "Купить молоко",
        "due_date": date(2024, 8, 1),
        "priority": 1,
        "title": "买牛奶",
        "user_name": "ユーザー"
    }
    prev_id = repo._id_counter
    prev_len = len(repo._tasks)
    task_create = TaskCreate(**task_data)
    task = repo.add_task(task_create)
    assert task.id == prev_id
    assert task.title == "买牛奶"
    assert task.description == "Купить молоко"
    assert task.priority == 1
    assert task.due_date == date(2024, 8, 1)
    assert task.user_name == "ユーザー"
    assert repo._id_counter == prev_id + 1
    assert len(repo._tasks) == prev_len + 1