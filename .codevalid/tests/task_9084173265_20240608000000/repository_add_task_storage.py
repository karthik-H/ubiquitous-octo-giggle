import pytest
from app.repositories.task_repository import TaskRepository

@pytest.fixture
def repo():
    return TaskRepository()

# Helper for max/min length fields
def repeat(s, n):
    return s * n

# Test Case 1: test_add_task_success_with_location_ames
def test_add_task_success_with_location_ames(repo):
    data = {
        "Description": "This is a test task.",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Sample Task",
        "User_name": "alice"
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response == {
        "Description": "This is a test task.",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Sample Task",
        "User_name": "alice",
        "id": 1
    }
    assert len(repo.tasks) == 1

# Test Case 2: test_add_task_success_with_location_boone
def test_add_task_success_with_location_boone(repo):
    data = {
        "Description": "Test for Boone.",
        "Due_date": "2024-08-15",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Another Task",
        "User_name": "bob"
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response == {
        "Description": "Test for Boone.",
        "Due_date": "2024-08-15",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Another Task",
        "User_name": "bob",
        "id": 1
    }
    assert len(repo.tasks) == 1

# Test Case 3: test_add_task_missing_title
def test_add_task_missing_title(repo):
    data = {
        "Description": "Missing title field.",
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Priority": "Low",
        "User_name": "charlie"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Title"}

# Test Case 4: test_add_task_missing_description
def test_add_task_missing_description(repo):
    data = {
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "Task No Description",
        "User_name": "charlie"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Description"}

# Test Case 5: test_add_task_missing_priority
def test_add_task_missing_priority(repo):
    data = {
        "Description": "Priority is missing.",
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Title": "Task No Priority",
        "User_name": "dana"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Priority"}

# Test Case 6: test_add_task_missing_due_date
def test_add_task_missing_due_date(repo):
    data = {
        "Description": "Due date is missing.",
        "Location": "Boone",
        "Priority": "High",
        "Title": "Task No Due Date",
        "User_name": "eva"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Due_date"}

# Test Case 7: test_add_task_missing_user_name
def test_add_task_missing_user_name(repo):
    data = {
        "Description": "User name is missing.",
        "Due_date": "2024-07-10",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Task No User Name"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: User_name"}

# Test Case 8: test_add_task_missing_location
def test_add_task_missing_location(repo):
    data = {
        "Description": "Location is missing.",
        "Due_date": "2024-07-10",
        "Priority": "Low",
        "Title": "Task No Location",
        "User_name": "frank"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Location"}

# Test Case 9: test_add_task_invalid_location
def test_add_task_invalid_location(repo):
    data = {
        "Description": "Invalid location value.",
        "Due_date": "2024-07-10",
        "Location": "Des Moines",
        "Priority": "High",
        "Title": "Task Invalid Location",
        "User_name": "george"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Location must be either 'Ames' or 'Boone'"}

# Test Case 10: test_add_task_empty_string_location
def test_add_task_empty_string_location(repo):
    data = {
        "Description": "Empty location value.",
        "Due_date": "2024-07-10",
        "Location": "",
        "Priority": "Low",
        "Title": "Task Empty Location",
        "User_name": "hannah"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Location must be either 'Ames' or 'Boone'"}

# Test Case 11: test_add_task_all_fields_min_length
def test_add_task_all_fields_min_length(repo):
    data = {
        "Description": "D",
        "Due_date": "2024-01-01",
        "Location": "Ames",
        "Priority": "L",
        "Title": "T",
        "User_name": "u"
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response == {
        "Description": "D",
        "Due_date": "2024-01-01",
        "Location": "Ames",
        "Priority": "L",
        "Title": "T",
        "User_name": "u",
        "id": 1
    }
    assert len(repo.tasks) == 1

# Test Case 12: test_add_task_all_fields_max_length
def test_add_task_all_fields_max_length(repo):
    data = {
        "Description": repeat("D", 1024),
        "Due_date": "2100-12-31",
        "Location": "Boone",
        "Priority": "High",
        "Title": repeat("T", 255),
        "User_name": repeat("U", 128)
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response == {
        "Description": repeat("D", 1024),
        "Due_date": "2100-12-31",
        "Location": "Boone",
        "Priority": "High",
        "Title": repeat("T", 255),
        "User_name": repeat("U", 128),
        "id": 1
    }
    assert len(repo.tasks) == 1

# Test Case 13: test_add_task_duplicate_data_assigns_unique_id
def test_add_task_duplicate_data_assigns_unique_id(repo):
    data1 = {
        "Description": "Same data",
        "Due_date": "2024-09-01",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Duplicate Task",
        "User_name": "ian"
    }
    data2 = {
        "Description": "Same data",
        "Due_date": "2024-09-01",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Duplicate Task",
        "User_name": "ian"
    }
    response1, status1 = repo.add_task(data1)
    response2, status2 = repo.add_task(data2)
    assert status1 == 201
    assert status2 == 201
    assert response1 == {
        "Description": "Same data",
        "Due_date": "2024-09-01",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Duplicate Task",
        "User_name": "ian",
        "id": 1
    }
    assert response2 == {
        "Description": "Same data",
        "Due_date": "2024-09-01",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Duplicate Task",
        "User_name": "ian",
        "id": 2
    }
    assert len(repo.tasks) == 2

# Test Case 14: test_add_task_id_counter_increment
def test_add_task_id_counter_increment(repo):
    data1 = {
        "Description": "First in list.",
        "Due_date": "2024-10-01",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "First Task",
        "User_name": "jane"
    }
    data2 = {
        "Description": "Second in list.",
        "Due_date": "2024-10-02",
        "Location": "Boone",
        "Priority": "High",
        "Title": "Second Task",
        "User_name": "kyle"
    }
    response1, status1 = repo.add_task(data1)
    response2, status2 = repo.add_task(data2)
    assert status1 == 201
    assert status2 == 201
    assert response1 == {
        "Description": "First in list.",
        "Due_date": "2024-10-01",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "First Task",
        "User_name": "jane",
        "id": 1
    }
    assert response2 == {
        "Description": "Second in list.",
        "Due_date": "2024-10-02",
        "Location": "Boone",
        "Priority": "High",
        "Title": "Second Task",
        "User_name": "kyle",
        "id": 2
    }
    assert len(repo.tasks) == 2