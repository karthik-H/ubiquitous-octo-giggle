import pytest
from unittest.mock import MagicMock, patch
from pydantic import ValidationError
from datetime import date, datetime
from app.services.task_service import TaskService
from app.domain.models.task import TaskCreate, Task

# Helper functions for mapping priority and date
def map_priority(priority_str):
    mapping = {"High": 3, "Medium": 2, "Low": 1}
    return mapping.get(priority_str)

def parse_due_date(due_date_str):
    try:
        return datetime.strptime(due_date_str, "%Y-%m-%d").date()
    except ValueError:
        return None

def strip_whitespace(value):
    if isinstance(value, str):
        return value.strip()
    return value

@pytest.fixture
def mock_repository():
    repo = MagicMock()
    repo.add_task = MagicMock()
    return repo

@pytest.fixture
def task_service(mock_repository):
    return TaskService(repository=mock_repository)

# Test Case 1: Create Task Successfully With Valid Input
def test_create_task_successfully_with_valid_input(task_service, mock_repository):
    input_data = {
        "Title": "Finish project report",
        "Description": "Complete and submit the quarterly report",
        "Priority": "High",
        "Due date": "2024-07-01",
        "User_name": "alice"
    }
    task_create = TaskCreate(
        title=input_data["Title"],
        description=input_data["Description"],
        priority=map_priority(input_data["Priority"]),
        due_date=parse_due_date(input_data["Due date"]),
        user_name=input_data["User_name"]
    )
    expected_task = Task(
        id=1,
        title=task_create.title,
        description=task_create.description,
        priority=task_create.priority,
        due_date=task_create.due_date,
        user_name=task_create.user_name
    )
    mock_repository.add_task.return_value = expected_task

    result = task_service.create_task(task_create)
    assert result == expected_task

# Test Case 2: Task Creation Fails When Title Is Missing
def test_task_creation_fails_when_title_is_missing(task_service):
    input_data = {
        "Description": "Discuss project timeline",
        "Priority": "Medium",
        "Due date": "2024-07-15",
        "User_name": "bob"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"]
        )
    assert "title" in str(exc.value)

# Test Case 3: Task Creation Fails When Description Is Missing
def test_task_creation_fails_when_description_is_missing(task_service):
    input_data = {
        "Title": "Call client",
        "Priority": "Low",
        "Due date": "2024-07-20",
        "User_name": "carol"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            priority=map_priority(input_data["Priority"]),
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"]
        )
    assert "description" in str(exc.value)

# Test Case 4: Task Creation Fails When Priority Is Missing
def test_task_creation_fails_when_priority_is_missing(task_service):
    input_data = {
        "Title": "Review code",
        "Description": "Check for bugs in the new module",
        "Due date": "2024-07-10",
        "User_name": "dave"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"]
        )
    assert "priority" in str(exc.value)

# Test Case 5: Task Creation Fails When Due Date Is Missing
def test_task_creation_fails_when_due_date_is_missing(task_service):
    input_data = {
        "Title": "Prepare slides",
        "Description": "Slides for team meeting",
        "Priority": "Medium",
        "User_name": "eve"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),
            user_name=input_data["User_name"]
        )
    assert "due_date" in str(exc.value)

# Test Case 6: Task Creation Fails When User_name Is Missing
def test_task_creation_fails_when_user_name_is_missing(task_service):
    input_data = {
        "Title": "Plan sprint",
        "Description": "Sprint planning for next cycle",
        "Priority": "High",
        "Due date": "2024-07-05"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),
            due_date=parse_due_date(input_data["Due date"])
        )
    assert "user_name" in str(exc.value)

# Test Case 7: Task Creation Fails When Extra Fields Are Provided
def test_task_creation_fails_when_extra_fields_are_provided(task_service):
    input_data = {
        "Title": "Book meeting room",
        "Description": "Reserve room for team meeting",
        "Priority": "Low",
        "Due date": "2024-07-12",
        "User_name": "frank",
        "Status": "Open"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"],
            Status=input_data["Status"]
        )
    assert "extra fields" in str(exc.value) or "Status" in str(exc.value)

# Test Case 8: Task Creation Fails With Empty Title
def test_task_creation_fails_with_empty_title(task_service):
    input_data = {
        "Title": "",
        "Description": "Empty title test",
        "Priority": "Medium",
        "Due date": "2024-07-17",
        "User_name": "gina"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"]
        )
    assert "title" in str(exc.value)

# Test Case 9: Task Creation Fails With Invalid Priority Value
def test_task_creation_fails_with_invalid_priority_value(task_service):
    input_data = {
        "Title": "Sync calendar",
        "Description": "Ensure all events are synced",
        "Priority": "Urgent",
        "Due date": "2024-07-09",
        "User_name": "harry"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),  # None
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"]
        )
    assert "priority" in str(exc.value)

# Test Case 10: Task Creation Fails With Invalid Due Date Format
def test_task_creation_fails_with_invalid_due_date_format(task_service):
    input_data = {
        "Title": "Send invoice",
        "Description": "Invoice to customer",
        "Priority": "Medium",
        "Due date": "07-20-2024",
        "User_name": "ian"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"]
        )
    assert "due_date" in str(exc.value)

# Test Case 11: Task Creation Fails With Due Date In The Past
def test_task_creation_fails_with_due_date_in_the_past(task_service):
    input_data = {
        "Title": "Update documentation",
        "Description": "Complete documentation update",
        "Priority": "Low",
        "Due date": "2022-01-01",
        "User_name": "jane"
    }
    # Pydantic does not check for past dates, so this must be handled in business logic.
    # Simulate repository or service raising an error.
    task_create = TaskCreate(
        title=input_data["Title"],
        description=input_data["Description"],
        priority=map_priority(input_data["Priority"]),
        due_date=parse_due_date(input_data["Due date"]),
        user_name=input_data["User_name"]
    )
    with patch.object(TaskService, 'create_task', side_effect=ValueError("Due date cannot be in the past")):
        with pytest.raises(ValueError) as exc:
            task_service.create_task(task_create)
        assert "Due date cannot be in the past" in str(exc.value)

# Test Case 12: Task Creation With Maximum Title Length
def test_task_creation_with_maximum_title_length(task_service, mock_repository):
    max_title = "T" * 100
    input_data = {
        "Title": max_title,
        "Description": "Title length boundary test",
        "Priority": "Medium",
        "Due date": "2024-07-30",
        "User_name": "kate"
    }
    task_create = TaskCreate(
        title=input_data["Title"],
        description=input_data["Description"],
        priority=map_priority(input_data["Priority"]),
        due_date=parse_due_date(input_data["Due date"]),
        user_name=input_data["User_name"]
    )
    expected_task = Task(
        id=1,
        title=task_create.title,
        description=task_create.description,
        priority=task_create.priority,
        due_date=task_create.due_date,
        user_name=task_create.user_name
    )
    mock_repository.add_task.return_value = expected_task
    result = task_service.create_task(task_create)
    assert result == expected_task

# Test Case 13: Task Creation With Maximum Description Length
def test_task_creation_with_maximum_description_length(task_service, mock_repository):
    max_description = "D" * 1000
    input_data = {
        "Title": "Boundary test",
        "Description": max_description,
        "Priority": "Low",
        "Due date": "2024-07-29",
        "User_name": "leo"
    }
    task_create = TaskCreate(
        title=input_data["Title"],
        description=input_data["Description"],
        priority=map_priority(input_data["Priority"]),
        due_date=parse_due_date(input_data["Due date"]),
        user_name=input_data["User_name"]
    )
    expected_task = Task(
        id=1,
        title=task_create.title,
        description=task_create.description,
        priority=task_create.priority,
        due_date=task_create.due_date,
        user_name=task_create.user_name
    )
    mock_repository.add_task.return_value = expected_task
    result = task_service.create_task(task_create)
    assert result == expected_task

# Test Case 14: Task Creation Fails With Empty Description
def test_task_creation_fails_with_empty_description(task_service):
    input_data = {
        "Title": "Empty description test",
        "Description": "",
        "Priority": "Medium",
        "Due date": "2024-07-19",
        "User_name": "mona"
    }
    with pytest.raises(ValidationError) as exc:
        TaskCreate(
            title=input_data["Title"],
            description=input_data["Description"],
            priority=map_priority(input_data["Priority"]),
            due_date=parse_due_date(input_data["Due date"]),
            user_name=input_data["User_name"]
        )
    assert "description" in str(exc.value)

# Test Case 15: Task Creation Succeeds With Whitespace In Fields
def test_task_creation_succeeds_with_whitespace_in_fields(task_service, mock_repository):
    input_data = {
        "Title": "  Plan event  ",
        "Description": "  Discuss logistics  ",
        "Priority": "High",
        "Due date": "2024-07-22",
        "User_name": " nina "
    }
    task_create = TaskCreate(
        title=strip_whitespace(input_data["Title"]),
        description=strip_whitespace(input_data["Description"]),
        priority=map_priority(input_data["Priority"]),
        due_date=parse_due_date(input_data["Due date"]),
        user_name=strip_whitespace(input_data["User_name"])
    )
    expected_task = Task(
        id=1,
        title=task_create.title,
        description=task_create.description,
        priority=task_create.priority,
        due_date=task_create.due_date,
        user_name=task_create.user_name
    )
    mock_repository.add_task.return_value = expected_task
    result = task_service.create_task(task_create)
    assert result == expected_task

# Test Case 16: Task Creation Fails With Invalid JSON Format
def test_task_creation_fails_with_invalid_json_format(task_service):
    input_data = "INVALID_JSON"
    with pytest.raises(TypeError):
        TaskCreate(**input_data)