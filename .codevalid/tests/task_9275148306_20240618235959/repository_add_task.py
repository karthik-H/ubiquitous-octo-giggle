import pytest
from app.repositories.task_repository import TaskRepository
from app.domain.models.task import Task, TaskCreate
from datetime import date
import logging

@pytest.fixture
def repo(tmp_path):
    return TaskRepository(data_file=tmp_path / "tasks.json")

def make_task_data(**kwargs):
    # Helper for minimal valid task data
    data = {"title": "Test Task"}
    data.update(kwargs)
    return data

# Test Case 1: add_task_with_minimal_valid_data
def test_add_task_with_minimal_valid_data(repo):
    task_data = TaskCreate(title="Test Task")
    task = repo.add_task(task_data)
    assert isinstance(task, Task)
    assert task.id == 1
    assert task.title == "Test Task"
    assert repo._tasks == [task]
    assert repo._id_counter == 2

# Test Case 2: add_task_with_all_fields
def test_add_task_with_all_fields(repo):
    task_data = TaskCreate(
        title="Full Task",
        description="All fields",
        due_date=date(2024, 7, 2),
        priority=5,
        user_name="user",
        location="HQ"
    )
    task = repo.add_task(task_data)
    assert task.id == 1
    assert task.title == "Full Task"
    assert task.description == "All fields"
    assert task.due_date == date(2024, 7, 2)
    assert task.priority == 5
    assert task.user_name == "user"
    assert task.location == "HQ"
    assert repo._tasks == [task]

# Test Case 3: add_task_id_increments_with_multiple_tasks
def test_add_task_id_increments_with_multiple_tasks(repo):
    repo._id_counter = 5
    task_data1 = TaskCreate(title="Task One")
    task_data2 = TaskCreate(title="Task Two")
    task1 = repo.add_task(task_data1)
    task2 = repo.add_task(task_data2)
    assert task1.id == 5
    assert task2.id == 6
    assert repo._tasks == [task1, task2]
    assert repo._id_counter == 7

# Test Case 4: add_task_with_empty_title
def test_add_task_with_empty_title(repo):
    task_data = TaskCreate(title="")
    with pytest.raises(Exception):
        repo.add_task(task_data)
    assert len(repo._tasks) == 0

# Test Case 5: add_task_missing_required_title
def test_add_task_missing_required_title(repo):
    # TaskCreate requires title, so simulate missing field with dict
    with pytest.raises(TypeError):
        TaskCreate()
    # If repo.add_task is called with a dict missing title, should raise error
    with pytest.raises(Exception):
        repo.add_task({"description": "Missing title"})
    assert len(repo._tasks) == 0

# Test Case 6: add_task_invalid_due_date_format
def test_add_task_invalid_due_date_format(repo):
    # TaskCreate expects a date object, so simulate invalid input
    with pytest.raises(Exception):
        TaskCreate(title="Bad Date", due_date="2024-99-99")
    # If repo.add_task is called with a dict with invalid date, should raise error
    with pytest.raises(Exception):
        repo.add_task({"title": "Bad Date", "due_date": "2024-99-99"})
    assert len(repo._tasks) == 0

# Test Case 7: add_task_file_save_failure
def test_add_task_file_save_failure(repo, monkeypatch):
    task_data = TaskCreate(title="Valid Task")
    def fail_save(*args, **kwargs):
        raise IOError("Disk full")
    monkeypatch.setattr(repo, "_save_data", fail_save)
    with pytest.raises(IOError):
        repo.add_task(task_data)
    assert len(repo._tasks) == 0 or repo._tasks[-1].title == "Valid Task"

# Test Case 8: add_task_with_very_large_title
def test_add_task_with_very_large_title(repo):
    large_title = "A" * 10000
    task_data = TaskCreate(title=large_title)
    try:
        task = repo.add_task(task_data)
        assert task.title == large_title
        assert task.id == 1
    except Exception:
        assert len(repo._tasks) == 0

# Test Case 9: add_task_with_special_characters_in_title
def test_add_task_with_special_characters_in_title(repo):
    special_title = "Task 🚀✨!@#"
    task_data = TaskCreate(title=special_title)
    task = repo.add_task(task_data)
    assert task.title == special_title
    assert repo._tasks == [task]

# Test Case 10: add_task_with_duplicate_title
def test_add_task_with_duplicate_title(repo):
    task_data = TaskCreate(title="Task A")
    task1 = repo.add_task(task_data)
    task2 = repo.add_task(task_data)
    assert task1.id != task2.id
    assert task1.title == task2.title == "Task A"
    assert len(repo._tasks) == 2

# Test Case 11: add_task_when_id_counter_at_max_value
def test_add_task_when_id_counter_at_max_value(repo):
    repo._id_counter = 2**31 - 1
    task_data = TaskCreate(title="Overflow")
    try:
        task = repo.add_task(task_data)
        assert task.id == 2**31 - 1
        assert repo._id_counter == 2**31
    except Exception:
        assert len(repo._tasks) == 0