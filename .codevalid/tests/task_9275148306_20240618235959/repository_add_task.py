import pytest
from app.repositories.task_repository import TaskRepository
from app.domain.models.task import Task, TaskCreate
from datetime import date
import logging

@pytest.fixture
def repo():
    return TaskRepository()

@pytest.fixture
def valid_task_data():
    return {
        "title": "Sample Task",
        "description": "Test Task",
        "priority": 3,
        "due_date": date(2024, 7, 1),
        "user_name": "tester",
        "location": "HQ"
    }

def make_task_create(data):
    # Fill missing required fields with defaults for TaskCreate
    defaults = {
        "title": "Default Title",
        "description": "Default Description",
        "priority": 1,
        "due_date": date(2024, 7, 1),
        "user_name": "default_user",
        "location": None
    }
    merged = {**defaults, **data}
    return TaskCreate(**merged)

# Test Case 1: Add Task with Valid Data
def test_add_task_with_valid_data(repo, valid_task_data, caplog):
    caplog.set_level(logging.INFO)
    task = repo.add_task(TaskCreate(**valid_task_data))
    assert task.id == 1
    for k, v in valid_task_data.items():
        assert getattr(task, k) == v
    assert repo._tasks == [task]
    assert repo._id_counter == 2
    assert f"Task created: {task}" in caplog.text

# Test Case 2: Add Multiple Tasks Sequentially
def test_add_multiple_tasks_sequentially(repo, caplog):
    caplog.set_level(logging.INFO)
    task_data_1 = {
        "title": "Task 1",
        "description": "Desc 1",
        "priority": 1,
        "due_date": date(2024, 7, 2),
        "user_name": "user1",
        "location": None
    }
    task_data_2 = {
        "title": "Task 2",
        "description": "Desc 2",
        "priority": 2,
        "due_date": date(2024, 7, 3),
        "user_name": "user2",
        "location": "Remote"
    }
    task1 = repo.add_task(TaskCreate(**task_data_1))
    task2 = repo.add_task(TaskCreate(**task_data_2))
    assert task1.id == 1
    assert task2.id == 2
    assert repo._tasks == [task1, task2]
    assert repo._id_counter == 3
    assert f"Task created: {task1}" in caplog.text
    assert f"Task created: {task2}" in caplog.text

# Test Case 3: Add Task with Missing Optional Fields
def test_add_task_with_missing_optional_fields(repo, caplog):
    caplog.set_level(logging.INFO)
    task_data = {
        "title": "Minimal Task",
        "description": "Minimal Desc",
        "priority": 1,
        "due_date": date(2024, 7, 4),
        "user_name": "minimal"
        # location omitted
    }
    task = repo.add_task(TaskCreate(**task_data))
    assert task.id == 1
    assert task.title == "Minimal Task"
    assert task.location is None
    assert repo._tasks == [task]
    assert f"Task created: {task}" in caplog.text

# Test Case 4: Add Task with Empty Task Data
def test_add_task_with_empty_task_data(repo):
    # TaskCreate requires fields, so this should raise a ValidationError
    with pytest.raises(Exception):
        repo.add_task(TaskCreate(**{}))

# Test Case 5: Add Task with Invalid Task Data Type
def test_add_task_with_invalid_task_data_type(repo):
    with pytest.raises(TypeError):
        repo.add_task("Not a dict")
    with pytest.raises(TypeError):
        repo.add_task(["Not", "a", "dict"])

# Test Case 6: Add Task with Special Characters in Task Data
def test_add_task_with_special_characters(repo, caplog):
    caplog.set_level(logging.INFO)
    task_data = {
        "title": "测试@!#",
        "description": "Task with special chars: ñ, ü, 😊",
        "priority": 2,
        "due_date": date(2024, 7, 5),
        "user_name": "unicode",
        "location": "🌍"
    }
    task = repo.add_task(TaskCreate(**task_data))
    assert task.id == 1
    assert task.title == "测试@!#"
    assert task.description == "Task with special chars: ñ, ü, 😊"
    assert repo._tasks == [task]
    assert f"Task created: {task}" in caplog.text

# Test Case 7: Add Task with Extremely Long Task Data
def test_add_task_with_extremely_long_task_data(repo, caplog):
    caplog.set_level(logging.INFO)
    long_title = "T" * 100
    long_description = "D" * 1000
    task_data = {
        "title": long_title,
        "description": long_description,
        "priority": 5,
        "due_date": date(2024, 7, 6),
        "user_name": "longuser",
        "location": "LongLoc"
    }
    task = repo.add_task(TaskCreate(**task_data))
    assert task.id == 1
    assert task.title == long_title
    assert task.description == long_description
    assert repo._tasks == [task]
    assert f"Task created: {task}" in caplog.text

# Test Case 8: Add Task with ID Counter Near Integer Overflow
def test_add_task_with_id_counter_near_integer_overflow(repo, caplog):
    caplog.set_level(logging.INFO)
    repo._id_counter = 2147483647
    task_data = {
        "title": "Overflow Task",
        "description": "Overflow Desc",
        "priority": 1,
        "due_date": date(2024, 7, 7),
        "user_name": "overflow",
        "location": None
    }
    task = repo.add_task(TaskCreate(**task_data))
    assert task.id == 2147483647
    assert repo._id_counter == 2147483648
    assert repo._tasks == [task]
    assert f"Task created: {task}" in caplog.text

# Test Case 9: Add Task with Duplicate Task Data
def test_add_task_with_duplicate_task_data(repo, caplog):
    caplog.set_level(logging.INFO)
    task_data = {
        "title": "Duplicate Task",
        "description": "Duplicate Desc",
        "priority": 1,
        "due_date": date(2024, 7, 8),
        "user_name": "dupe",
        "location": None
    }
    task1 = repo.add_task(TaskCreate(**task_data))
    task2 = repo.add_task(TaskCreate(**task_data))
    assert task1.id == 1
    assert task2.id == 2
    assert repo._tasks == [task1, task2]
    assert f"Task created: {task1}" in caplog.text
    assert f"Task created: {task2}" in caplog.text

# Test Case 10: Add Task with Logging Failure
def test_add_task_with_logging_failure(repo, monkeypatch):
    # Simulate logging failure by patching logger.info to raise
    def fail_log(msg):
        raise RuntimeError("Logging failed")
    repo.logger.info = fail_log
    task_data = {
        "title": "Log Fail Task",
        "description": "Log Fail Desc",
        "priority": 1,
        "due_date": date(2024, 7, 9),
        "user_name": "logfail",
        "location": None
    }
    # Task should be created and appended, but logging fails
    with pytest.raises(RuntimeError):
        repo.add_task(TaskCreate(**task_data))
    # Task is still appended before log failure
    assert len(repo._tasks) == 1
    assert repo._tasks[0].title == "Log Fail Task"