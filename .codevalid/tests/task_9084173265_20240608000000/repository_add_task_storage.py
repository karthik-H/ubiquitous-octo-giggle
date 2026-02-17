import pytest
from app.repositories.task_repository import TaskRepository
from app.domain.models.task import TaskCreate
from datetime import date

def priority_str_to_int(priority):
    mapping = {"Low": 1, "Medium": 3, "High": 5}
    return mapping.get(priority, None)

def make_task_create(data):
    # Convert string priority to int if needed
    fields = {}
    for k, v in data.items():
        if k.lower() == "priority":
            if isinstance(v, str):
                fields[k] = priority_str_to_int(v)
            else:
                fields[k] = v
        elif k.lower() == "due date":
            if isinstance(v, str) and v:
                try:
                    fields["due_date"] = date.fromisoformat(v)
                except Exception:
                    fields["due_date"] = v
            else:
                fields["due_date"] = v
        elif k.lower() == "title":
            fields["title"] = v
        elif k.lower() == "description":
            fields["description"] = v
        elif k.lower() == "user_name":
            fields["user_name"] = v
        else:
            fields[k] = v
    return fields

@pytest.fixture
def repo():
    return TaskRepository()

# Test Case 1: Add task with all valid fields
def test_add_task_with_all_valid_fields(repo):
    data = {
        "Description": "Complete unit testing",
        "Due date": "2024-07-01",
        "Priority": "High",
        "Title": "Sample Task",
        "User_name": "alice"
    }
    task_data = make_task_create(data)
    task = repo.add_task(TaskCreate(**task_data))
    assert task.description == "Complete unit testing"
    assert task.due_date == date(2024, 7, 1)
    assert task.priority == 5
    assert task.title == "Sample Task"
    assert task.user_name == "alice"
    assert task.id == 1
    assert len(repo.list_tasks()) == 1

# Test Case 2: Add task missing required Title field
def test_add_task_missing_title(repo):
    data = {
        "Description": "Missing title",
        "Due date": "2024-07-01",
        "Priority": "Medium",
        "User_name": "bob"
    }
    task_data = make_task_create(data)
    with pytest.raises(TypeError):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 3: Add task missing required Description field
def test_add_task_missing_description(repo):
    data = {
        "Due date": "2024-07-02",
        "Priority": "Low",
        "Title": "Task without description",
        "User_name": "charlie"
    }
    task_data = make_task_create(data)
    with pytest.raises(TypeError):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 4: Add task missing required Priority field
def test_add_task_missing_priority(repo):
    data = {
        "Description": "Priority not specified",
        "Due date": "2024-07-03",
        "Title": "Task without priority",
        "User_name": "david"
    }
    task_data = make_task_create(data)
    with pytest.raises(TypeError):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 5: Add task missing required Due date field
def test_add_task_missing_due_date(repo):
    data = {
        "Description": "Due date not specified",
        "Priority": "High",
        "Title": "Task without due date",
        "User_name": "eve"
    }
    task_data = make_task_create(data)
    with pytest.raises(TypeError):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 6: Add task missing required User_name field
def test_add_task_missing_user_name(repo):
    data = {
        "Description": "User name not specified",
        "Due date": "2024-07-04",
        "Priority": "Medium",
        "Title": "Task without user name"
    }
    task_data = make_task_create(data)
    with pytest.raises(TypeError):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 7: Add task with extra field
def test_add_task_with_extra_field(repo):
    data = {
        "Description": "Testing extra field",
        "Due date": "2024-07-05",
        "ExtraField": "should not be accepted",
        "Priority": "Low",
        "Title": "Task with extra field",
        "User_name": "frank"
    }
    task_data = make_task_create(data)
    with pytest.raises(TypeError):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 8: Add task with empty string for required fields
def test_add_task_with_empty_strings(repo):
    data = {
        "Description": "",
        "Due date": "",
        "Priority": "",
        "Title": "",
        "User_name": ""
    }
    task_data = make_task_create(data)
    with pytest.raises(Exception):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 9: Add task with invalid priority value
def test_add_task_with_invalid_priority(repo):
    data = {
        "Description": "Priority not accepted",
        "Due date": "2024-07-06",
        "Priority": "Urgent",
        "Title": "Task invalid priority",
        "User_name": "grace"
    }
    task_data = make_task_create(data)
    with pytest.raises(Exception):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 10: Add task with invalid due date format
def test_add_task_with_invalid_due_date_format(repo):
    data = {
        "Description": "Due date wrong format",
        "Due date": "07/07/2024",
        "Priority": "Medium",
        "Title": "Task invalid due date",
        "User_name": "harry"
    }
    task_data = make_task_create(data)
    with pytest.raises(Exception):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 11: Add task with Title at maximum allowed length
def test_add_task_with_title_max_length(repo):
    max_title = "T" * 100
    data = {
        "Description": "Boundary test for title length",
        "Due date": "2024-07-08",
        "Priority": "High",
        "Title": max_title,
        "User_name": "ivan"
    }
    task_data = make_task_create(data)
    task = repo.add_task(TaskCreate(**task_data))
    assert task.title == max_title
    assert task.id == 1
    assert len(repo.list_tasks()) == 1

# Test Case 12: Add task with duplicate Title
def test_add_task_with_duplicate_title(repo):
    data1 = {
        "Description": "First instance",
        "Due date": "2024-07-09",
        "Priority": "Medium",
        "Title": "Duplicate Task",
        "User_name": "jane"
    }
    data2 = {
        "Description": "Second instance",
        "Due date": "2024-07-10",
        "Priority": "High",
        "Title": "Duplicate Task",
        "User_name": "jane"
    }
    task1 = repo.add_task(TaskCreate(**make_task_create(data1)))
    task2 = repo.add_task(TaskCreate(**make_task_create(data2)))
    assert task1.title == task2.title
    assert task1.id != task2.id
    assert len(repo.list_tasks()) == 2

# Test Case 13: Add task with minimum length valid fields
def test_add_task_with_min_length_fields(repo):
    data = {
        "Description": "B",
        "Due date": "2024-07-11",
        "Priority": "Low",
        "Title": "A",
        "User_name": "C"
    }
    task_data = make_task_create(data)
    task = repo.add_task(TaskCreate(**task_data))
    assert task.description == "B"
    assert task.due_date == date(2024, 7, 11)
    assert task.priority == 1
    assert task.title == "A"
    assert task.user_name == "C"
    assert task.id == 1
    assert len(repo.list_tasks()) == 1

# Test Case 14: ID increment for multiple tasks
def test_id_increment_for_multiple_tasks(repo):
    data1 = {
        "Description": "First",
        "Due date": "2024-07-12",
        "Priority": "Low",
        "Title": "First Task",
        "User_name": "dan"
    }
    data2 = {
        "Description": "Second",
        "Due date": "2024-07-13",
        "Priority": "Medium",
        "Title": "Second Task",
        "User_name": "dan"
    }
    task1 = repo.add_task(TaskCreate(**make_task_create(data1)))
    task2 = repo.add_task(TaskCreate(**make_task_create(data2)))
    assert task1.id == 1
    assert task2.id == 2
    assert len(repo.list_tasks()) == 2

# Test Case 15: Add task with null values for required fields
def test_add_task_with_null_values(repo):
    data = {
        "Description": None,
        "Due date": None,
        "Priority": None,
        "Title": None,
        "User_name": None
    }
    task_data = make_task_create(data)
    with pytest.raises(Exception):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0

# Test Case 16: Add task with whitespace-only values for required fields
def test_add_task_with_whitespace_only_fields(repo):
    data = {
        "Description": "   ",
        "Due date": "2024-07-14",
        "Priority": "Low",
        "Title": " ",
        "User_name": "   "
    }
    task_data = make_task_create(data)
    with pytest.raises(Exception):
        repo.add_task(TaskCreate(**task_data))
    assert len(repo.list_tasks()) == 0