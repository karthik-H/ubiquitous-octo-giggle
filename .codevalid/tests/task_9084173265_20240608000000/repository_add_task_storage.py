import pytest
from app.repositories.task_repository import TaskRepository

@pytest.fixture
def repo():
    return TaskRepository()

def repeat(s, n):
    return s * n

# Test Case 1: test_add_task_successful_with_location_ames
def test_add_task_successful_with_location_ames(repo):
    data = {
        "Description": "Milk, Bread, Eggs",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Buy groceries",
        "User_name": "alice"
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response["Description"] == "Milk, Bread, Eggs"
    assert response["Due_date"] == "2024-07-01"
    assert response["Location"] == "Ames"
    assert response["Priority"] == "High"
    assert response["Title"] == "Buy groceries"
    assert response["User_name"] == "alice"
    assert isinstance(response["id"], int)
    assert len(repo.tasks) == 1

# Test Case 2: test_add_task_successful_with_location_boone
def test_add_task_successful_with_location_boone(repo):
    data = {
        "Description": "Discuss project progress",
        "Due_date": "2024-07-10",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Team meeting",
        "User_name": "bob"
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response["Description"] == "Discuss project progress"
    assert response["Due_date"] == "2024-07-10"
    assert response["Location"] == "Boone"
    assert response["Priority"] == "Medium"
    assert response["Title"] == "Team meeting"
    assert response["User_name"] == "bob"
    assert isinstance(response["id"], int)
    assert len(repo.tasks) == 1

# Test Case 3: test_add_task_location_invalid
def test_add_task_location_invalid(repo):
    data = {
        "Description": "Fix kitchen sink",
        "Due_date": "2024-07-15",
        "Location": "Des Moines",
        "Priority": "Low",
        "Title": "Call plumber",
        "User_name": "carol"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Invalid location. Must be 'Ames' or 'Boone'."}

# Test Case 4: test_add_task_missing_title
def test_add_task_missing_title(repo):
    data = {
        "Description": "Prepare monthly report",
        "Due_date": "2024-08-01",
        "Location": "Ames",
        "Priority": "High",
        "User_name": "dave"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Title"}

# Test Case 5: test_add_task_missing_description
def test_add_task_missing_description(repo):
    data = {
        "Due_date": "2024-08-02",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Complete assignment",
        "User_name": "eve"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Description"}

# Test Case 6: test_add_task_missing_priority
def test_add_task_missing_priority(repo):
    data = {
        "Description": "Annual checkup",
        "Due_date": "2024-08-10",
        "Location": "Ames",
        "Title": "Schedule dentist appointment",
        "User_name": "frank"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Priority"}

# Test Case 7: test_add_task_missing_due_date
def test_add_task_missing_due_date(repo):
    data = {
        "Description": "Sort and archive emails",
        "Location": "Boone",
        "Priority": "Low",
        "Title": "Organize files",
        "User_name": "gina"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Due_date"}

# Test Case 8: test_add_task_missing_user_name
def test_add_task_missing_user_name(repo):
    data = {
        "Description": "Electricity and water",
        "Due_date": "2024-08-15",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Pay bills"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: User_name"}

# Test Case 9: test_add_task_missing_location
def test_add_task_missing_location(repo):
    data = {
        "Description": "Before road trip",
        "Due_date": "2024-08-20",
        "Priority": "Medium",
        "Title": "Refuel car",
        "User_name": "hank"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required field: Location"}

# Test Case 10: test_add_task_multiple_missing_fields
def test_add_task_multiple_missing_fields(repo):
    data = {
        "Description": "Yearly tax filing",
        "Title": "Submit tax documents"
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {"error": "Missing required fields: Priority, Due_date, User_name, Location"}

# Test Case 11: test_add_task_empty_strings
def test_add_task_empty_strings(repo):
    data = {
        "Description": "",
        "Due_date": "",
        "Location": "Ames",
        "Priority": "",
        "Title": "",
        "User_name": ""
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response["Description"] == ""
    assert response["Due_date"] == ""
    assert response["Location"] == "Ames"
    assert response["Priority"] == ""
    assert response["Title"] == ""
    assert response["User_name"] == ""
    assert isinstance(response["id"], int)
    assert len(repo.tasks) == 1

# Test Case 12: test_add_task_long_strings
def test_add_task_long_strings(repo):
    data = {
        "Description": repeat("D", 1024),
        "Due_date": "2024-12-31",
        "Location": "Boone",
        "Priority": "High",
        "Title": repeat("T", 255),
        "User_name": repeat("U", 255)
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response["Description"] == repeat("D", 1024)
    assert response["Due_date"] == "2024-12-31"
    assert response["Location"] == "Boone"
    assert response["Priority"] == "High"
    assert response["Title"] == repeat("T", 255)
    assert response["User_name"] == repeat("U", 255)
    assert isinstance(response["id"], int)
    assert len(repo.tasks) == 1

# Test Case 13: test_add_task_duplicate_task_same_fields
def test_add_task_duplicate_task_same_fields(repo):
    data = {
        "Description": "Duplicate task entry",
        "Due_date": "2024-09-01",
        "Location": "Ames",
        "Priority": "Medium",
        "Title": "Test duplicate",
        "User_name": "ivy"
    }
    response1, status1 = repo.add_task(data)
    response2, status2 = repo.add_task(data)
    assert status1 == 201
    assert status2 == 201
    assert response1["id"] != response2["id"]
    assert response1["Description"] == response2["Description"] == "Duplicate task entry"
    assert response1["Due_date"] == response2["Due_date"] == "2024-09-01"
    assert response1["Location"] == response2["Location"] == "Ames"
    assert response1["Priority"] == response2["Priority"] == "Medium"
    assert response1["Title"] == response2["Title"] == "Test duplicate"
    assert response1["User_name"] == response2["User_name"] == "ivy"
    assert len(repo.tasks) == 2

# Test Case 14: test_add_task_id_increment
def test_add_task_id_increment(repo):
    data1 = {
        "Description": "First entry",
        "Due_date": "2024-06-30",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "First task",
        "User_name": "jack"
    }
    data2 = {
        "Description": "Second entry",
        "Due_date": "2024-07-05",
        "Location": "Boone",
        "Priority": "High",
        "Title": "Second task",
        "User_name": "kate"
    }
    response1, status1 = repo.add_task(data1)
    response2, status2 = repo.add_task(data2)
    assert status1 == 201
    assert status2 == 201
    assert response2["id"] == response1["id"] + 1
    assert response1["Description"] == "First entry"
    assert response2["Description"] == "Second entry"
    assert response1["Due_date"] == "2024-06-30"
    assert response2["Due_date"] == "2024-07-05"
    assert response1["Location"] == "Ames"
    assert response2["Location"] == "Boone"
    assert response1["Priority"] == "Low"
    assert response2["Priority"] == "High"
    assert response1["Title"] == "First task"
    assert response2["Title"] == "Second task"
    assert response1["User_name"] == "jack"
    assert response2["User_name"] == "kate"
    assert len(repo.tasks) == 2