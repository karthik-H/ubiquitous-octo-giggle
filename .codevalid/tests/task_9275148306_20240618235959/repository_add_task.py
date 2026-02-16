import pytest
from app.repositories.task_repository import TaskRepository
from app.domain.models.task import Task, TaskCreate
from datetime import date
import logging
import os

@pytest.fixture
def repo(tmp_path):
    # Use tmp_path for file persistence tests
    return TaskRepository(tasks_file=tmp_path / "tasks.json")

def make_task_data(**kwargs):
    # Helper for minimal valid task data
    data = {
        "title": "Test Task",
        "description": "Test Desc",
        "priority": 1,
        "due_date": date(2024, 7, 1),
        "user_name": "tester",
        "location": None
    }
    data.update(kwargs)
    return data

# Test Case 1: add_task_with_minimal_valid_data
def test_add_task_with_minimal_valid_data(repo):
    task_data = {"title": "Test Task"}
    task = repo.add_task(task_data)
    assert isinstance(task, Task)
    assert task.id == 1
    assert task.title == "Test Task"
    assert repo._tasks == [task]
    assert repo._id_counter == 2

# Test Case 2: add_task_with_all_fields
def test_add_task_with_all_fields(repo):
    task_data = {
        "title": "Full Task",
        "description": "All fields",
        "priority": 5,
        "due_date": date(2024, 7, 2),
        "user_name": "user",
        "location": "HQ"
    }
    task = repo.add_task(task_data)
    assert task.id == 1
    assert task.title == "Full Task"
    assert task.description == "All fields"
    assert task.priority == 5
    assert task.due_date == date(2024, 7, 2)
    assert task.user_name == "user"
    assert task.location == "HQ"
    assert repo._tasks == [task]

# Test Case 3: add_multiple_tasks_assigns_sequential_ids
def test_add_multiple_tasks_assigns_sequential_ids(repo):
    for i in range(3):
        task_data = {"title": f"Task {i+1}"}
        task = repo.add_task(task_data)
        assert task.id == i + 1
    assert len(repo._tasks) == 3
    assert repo._tasks[0].id == 1
    assert repo._tasks[1].id == 2
    assert repo._tasks[2].id == 3

# Test Case 4: task_is_persisted_to_file
def test_task_is_persisted_to_file(repo):
    task_data = {"title": "Persisted Task"}
    task = repo.add_task(task_data)
    # Reload repository from file
    new_repo = TaskRepository(tasks_file=repo.tasks_file)
    new_repo.load_tasks()
    assert any(t.title == "Persisted Task" for t in new_repo._tasks)

# Test Case 5: creation_logged
def test_creation_logged(repo, caplog):
    caplog.set_level(logging.INFO)
    task_data = {"title": "Log Task"}
    task = repo.add_task(task_data)
    assert f"Task created: {task}" in caplog.text

# Test Case 6: add_task_missing_required_field
def test_add_task_missing_required_field(repo):
    task_data = {"description": "Missing title"}
    with pytest.raises(Exception):
        repo.add_task(task_data)
    assert len(repo._tasks) == 0

# Test Case 7: add_task_invalid_field_type
def test_add_task_invalid_field_type(repo):
    task_data = {"title": 123}
    with pytest.raises(Exception):
        repo.add_task(task_data)
    assert len(repo._tasks) == 0

# Test Case 8: add_duplicate_task
def test_add_duplicate_task(repo):
    task_data = {"title": "Dupe"}
    task1 = repo.add_task(task_data)
    task2 = repo.add_task(task_data)
    assert task1.id != task2.id
    assert len(repo._tasks) == 2

# Test Case 9: add_task_with_large_fields
def test_add_task_with_large_fields(repo):
    large_title = "A" * 10000
    task_data = {"title": large_title}
    try:
        task = repo.add_task(task_data)
        assert task.title == large_title
        assert task.id == 1
    except Exception:
        # If implementation limits exceeded, error is expected
        assert len(repo._tasks) == 0

# Test Case 10: file_write_error_on_add_task
def test_file_write_error_on_add_task(repo, monkeypatch):
    task_data = {"title": "Write Error"}
    def fail_write(*args, **kwargs):
        raise IOError("Disk full")
    monkeypatch.setattr(repo, "save_tasks", fail_write)
    with pytest.raises(IOError):
        repo.add_task(task_data)
    assert len(repo._tasks) == 0

# Test Case 11: id_counter_at_maximum_value
def test_id_counter_at_maximum_value(repo):
    repo._id_counter = 2**31 - 1
    task_data = {"title": "Overflow"}
    try:
        task = repo.add_task(task_data)
        assert task.id == 2**31 - 1
        assert repo._id_counter == 2**31
    except Exception:
        # If overflow error is raised, that's acceptable
        assert len(repo._tasks) == 0

# Test Case 12: add_task_with_empty_dict
def test_add_task_with_empty_dict(repo):
    with pytest.raises(Exception):
        repo.add_task({})
    assert len(repo._tasks) == 0

# Test Case 13: add_task_with_null_input(repo):
def test_add_task_with_null_input(repo):
    with pytest.raises(Exception):
        repo.add_task(None)
    assert len(repo._tasks) == 0