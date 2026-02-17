import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def repeat_char(char, count):
    return char * count

@pytest.fixture(autouse=True)
def clear_tasks(monkeypatch):
    """
    Fixture to clear tasks before each test if the service/repository supports it.
    If not, this can be removed or adapted.
    """
    pass

# Test Case 1: Create task with valid attributes and Location 'Ames'
def test_create_task_with_valid_attributes_location_ames():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    resp = response.json()
    expected = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice",
        "id": resp.get("id")
    }
    assert resp == expected

# Test Case 2: Create task with valid attributes and Location 'Boone'
def test_create_task_with_valid_attributes_location_boone():
    payload = {
        "Description": "Prepare presentation",
        "Due_date": "2024-07-10",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Task 2",
        "User_name": "bob"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    resp = response.json()
    expected = {
        "Description": "Prepare presentation",
        "Due_date": "2024-07-10",
        "Location": "Boone",
        "Priority": "Medium",
        "Title": "Task 2",
        "User_name": "bob",
        "id": resp.get("id")
    }
    assert resp == expected

# Test Case 3: Create task with missing Title attribute
def test_create_task_missing_title():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Missing required attribute: Title"}

# Test Case 4: Create task with missing Description attribute
def test_create_task_missing_description():
    payload = {
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Missing required attribute: Description"}

# Test Case 5: Create task with missing Priority attribute
def test_create_task_missing_priority():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Missing required attribute: Priority"}

# Test Case 6: Create task with missing Due_date attribute
def test_create_task_missing_due_date():
    payload = {
        "Description": "Complete the report",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Missing required attribute: Due_date"}

# Test Case 7: Create task with missing User_name attribute
def test_create_task_missing_user_name():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Missing required attribute: User_name"}

# Test Case 8: Create task with missing Location attribute
def test_create_task_missing_location():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Missing required attribute: Location"}

# Test Case 9: Create task with invalid Location value
def test_create_task_invalid_location_value():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Des Moines",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid Location value: must be 'Ames' or 'Boone'"}

# Test Case 10: Create task with Location value 'ames' (case sensitivity)
def test_create_task_location_case_sensitive_ames():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid Location value: must be 'Ames' or 'Boone'"}

# Test Case 11: Create task with Location value 'BOONE' (case sensitivity)
def test_create_task_location_case_sensitive_boone():
    payload = {
        "Description": "Prepare presentation",
        "Due_date": "2024-07-10",
        "Location": "BOONE",
        "Priority": "Medium",
        "Title": "Task 2",
        "User_name": "bob"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid Location value: must be 'Ames' or 'Boone'"}

# Test Case 12: Create task with empty Title string
def test_create_task_empty_title():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Title cannot be empty"}

# Test Case 13: Create task with empty Description string
def test_create_task_empty_description():
    payload = {
        "Description": "",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Description cannot be empty"}

# Test Case 14: Create task with empty Priority string
def test_create_task_empty_priority():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Priority cannot be empty"}

# Test Case 15: Create task with empty Due_date string
def test_create_task_empty_due_date():
    payload = {
        "Description": "Complete the report",
        "Due_date": "",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Due_date cannot be empty"}

# Test Case 16: Create task with empty User_name string
def test_create_task_empty_user_name():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": ""
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "User_name cannot be empty"}

# Test Case 17: Create task with empty Location string
def test_create_task_empty_location():
    payload = {
        "Description": "Complete the report",
        "Due_date": "2024-07-01",
        "Location": "",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid Location value: must be 'Ames' or 'Boone'"}

# Test Case 18: Create task with incorrectly formatted Due_date
def test_create_task_invalid_due_date_format():
    payload = {
        "Description": "Complete the report",
        "Due_date": "01-07-2024",
        "Location": "Ames",
        "Priority": "High",
        "Title": "Task 1",
        "User_name": "alice"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Due_date must be in 'YYYY-MM-DD' format"}

# Test Case 19: Create task with extra attributes in request body
def test_create_task_with_extra_attributes():
    payload = {
        "Description": "Review documents",
        "Due_date": "2024-07-15",
        "ExtraField": "should_be_ignored",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "Task 3",
        "User_name": "carol"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    resp = response.json()
    expected = {
        "Description": "Review documents",
        "Due_date": "2024-07-15",
        "Location": "Ames",
        "Priority": "Low",
        "Title": "Task 3",
        "User_name": "carol",
        "id": resp.get("id")
    }
    assert resp == expected

# Test Case 20: Create task with Priority at boundary limit (long string)
def test_create_task_priority_exceeds_max_length():
    payload = {
        "Description": "Boundary test",
        "Due_date": "2024-07-20",
        "Location": "Boone",
        "Priority": repeat_char("A", 256),
        "Title": "Task 4",
        "User_name": "dan"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 400
    assert response.json() == {"error": "Priority value exceeds maximum allowed length"}

# Test Case 21: Create task with all fields at maximum allowed length
def test_create_task_all_fields_max_length():
    payload = {
        "Description": repeat_char("D", 1024),
        "Due_date": "2024-07-31",
        "Location": "Ames",
        "Priority": "High",
        "Title": repeat_char("T", 255),
        "User_name": repeat_char("U", 128)
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    resp = response.json()
    expected = {
        "Description": repeat_char("D", 1024),
        "Due_date": "2024-07-31",
        "Location": "Ames",
        "Priority": "High",
        "Title": repeat_char("T", 255),
        "User_name": repeat_char("U", 128),
        "id": resp.get("id")
    }
    assert resp == expected

# Test Case 22: Create task with all fields at minimum allowed length
def test_create_task_all_fields_min_length():
    payload = {
        "Description": "D",
        "Due_date": "2024-07-01",
        "Location": "Boone",
        "Priority": "P",
        "Title": "T",
        "User_name": "U"
    }
    response = client.post("/tasks", json=payload)
    assert response.status_code == 201
    resp = response.json()
    expected = {
        "Description": "D",
        "Due_date": "2024-07-01",
        "Location": "Boone",
        "Priority": "P",
        "Title": "T",
        "User_name": "U",
        "id": resp.get("id")
    }
    assert resp == expected