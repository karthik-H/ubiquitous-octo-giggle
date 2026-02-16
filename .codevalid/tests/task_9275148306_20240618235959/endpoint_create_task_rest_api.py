import pytest
from fastapi.testclient import TestClient
from fastapi import status
from app.main import app
from app.controllers.task_controller import task_service
from app.domain.models.task import TaskCreate, Task

client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_task_service(monkeypatch):
    # Patch task_service.create_task for each test
    class MockTaskService:
        def __init__(self):
            self.tasks = {}

        def create_task(self, task_data):
            # Duplicate title check
            if task_data.title in self.tasks:
                raise Exception("Task with this title already exists")
            # Title length check
            if len(task_data.title) > 100:
                raise Exception("Title exceeds maximum length")
            # Priority check
            if not (1 <= task_data.priority <= 5):
                raise Exception("Priority value is invalid")
            # Due date format is handled by Pydantic, so invalid format will not reach here
            # Description can be empty if allowed
            task_id = len(self.tasks) + 1
            task = Task(
                id=task_id,
                title=task_data.title,
                description=task_data.description,
                priority=task_data.priority,
                due_date=task_data.due_date,
                user_name=task_data.user_name
            )
            self.tasks[task_data.title] = task
            return task

    monkeypatch.setattr(task_service, "create_task", MockTaskService().create_task)

# Helper for valid task data
def valid_task_data(**kwargs):
    data = {
        "title": "Complete documentation",
        "description": "Prepare API docs for release",
        "priority": 5,
        "due_date": "2024-07-01",
        "user_name": "testuser"
    }
    data.update(kwargs)
    return data

def test_create_task_with_valid_data():
    response = client.post("/tasks", json=valid_task_data())
    assert response.status_code == status.HTTP_201_CREATED
    resp = response.json()
    assert resp["title"] == "Complete documentation"
    assert resp["description"] == "Prepare API docs for release"
    assert resp["priority"] == 5
    assert resp["due_date"] == "2024-07-01"
    assert resp["user_name"] == "testuser"
    assert "id" in resp

def test_create_task_missing_title():
    data = valid_task_data()
    del data["title"]
    response = client.post("/tasks", json=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "detail" in response.json()
    assert "field required" in response.json()["detail"][0]["msg"]

def test_create_task_with_invalid_due_date_format():
    data = valid_task_data(due_date="01-07-2024")
    response = client.post("/tasks", json=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "detail" in response.json()
    assert "invalid date format" in response.json()["detail"][0]["msg"]

def test_create_task_with_duplicate_title():
    # First, create the task
    client.post("/tasks", json=valid_task_data())
    # Try to create again with same title
    response = client.post("/tasks", json=valid_task_data())
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Task with this title already exists"

def test_create_task_with_empty_description():
    data = valid_task_data(description="")
    response = client.post("/tasks", json=data)
    assert response.status_code == status.HTTP_201_CREATED
    resp = response.json()
    assert resp["description"] == ""
    assert resp["title"] == "Task with no description" or resp["title"] == "Complete documentation"

def test_create_task_with_invalid_priority():
    data = valid_task_data(priority=10)
    response = client.post("/tasks", json=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Priority value is invalid"

def test_create_task_with_maximum_title_length():
    max_title = "T" * 100
    data = valid_task_data(title=max_title, priority=1)
    response = client.post("/tasks", json=data)
    assert response.status_code == status.HTTP_201_CREATED
    resp = response.json()
    assert resp["title"] == max_title

def test_create_task_with_title_exceeding_max_length():
    too_long_title = "T" * 101
    data = valid_task_data(title=too_long_title)
    response = client.post("/tasks", json=data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Title exceeds maximum length"

def test_create_task_with_empty_request_body():
    response = client.post("/tasks", json={})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "detail" in response.json()
    assert "field required" in response.json()["detail"][0]["msg"]

def test_create_task_with_invalid_json():
    response = client.post("/tasks", data="invalid_json", headers={"Content-Type": "application/json"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "detail" in response.json()
    assert "Expecting value" in response.json()["detail"]
