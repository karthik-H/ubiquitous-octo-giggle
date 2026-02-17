import pytest
from app.repositories.task_repository import TaskRepository

@pytest.fixture
def repo():
    return TaskRepository()

def test_add_task_success_location_ames(repo):
    # Test Case 1
    data = {
        'Description': 'Finish and submit the final report',
        'Due_date': '2024-07-10',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Complete project report',
        'User_name': 'john_doe'
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response['Description'] == data['Description']
    assert response['Due_date'] == data['Due_date']
    assert response['Location'] == data['Location']
    assert response['Priority'] == data['Priority']
    assert response['Title'] == data['Title']
    assert response['User_name'] == data['User_name']
    assert 'id' in response

def test_add_task_success_location_boone(repo):
    # Test Case 2
    data = {
        'Description': 'Discuss project status',
        'Due_date': '2024-07-15',
        'Location': 'Boone',
        'Priority': 'Medium',
        'Title': 'Team meeting',
        'User_name': 'jane_smith'
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response['Description'] == data['Description']
    assert response['Due_date'] == data['Due_date']
    assert response['Location'] == data['Location']
    assert response['Priority'] == data['Priority']
    assert response['Title'] == data['Title']
    assert response['User_name'] == data['User_name']
    assert 'id' in response

def test_add_task_missing_title(repo):
    # Test Case 3
    data = {
        'Description': 'No title provided',
        'Due_date': '2024-08-01',
        'Location': 'Ames',
        'Priority': 'Low',
        'User_name': 'alex_lee'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': 'Missing required attribute: Title'}

def test_add_task_missing_description(repo):
    # Test Case 4
    data = {
        'Due_date': '2024-08-01',
        'Location': 'Ames',
        'Priority': 'Low',
        'Title': 'Task without description',
        'User_name': 'alex_lee'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': 'Missing required attribute: Description'}

def test_add_task_missing_priority(repo):
    # Test Case 5
    data = {
        'Description': 'Priority not specified',
        'Due_date': '2024-08-01',
        'Location': 'Ames',
        'Title': 'Task without priority',
        'User_name': 'alex_lee'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': 'Missing required attribute: Priority'}

def test_add_task_missing_due_date(repo):
    # Test Case 6
    data = {
        'Description': 'Due date not specified',
        'Location': 'Ames',
        'Priority': 'Medium',
        'Title': 'Task without due date',
        'User_name': 'alex_lee'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': 'Missing required attribute: Due_date'}

def test_add_task_missing_user_name(repo):
    # Test Case 7
    data = {
        'Description': 'User name not specified',
        'Due_date': '2024-08-01',
        'Location': 'Ames',
        'Priority': 'Medium',
        'Title': 'Task without user name'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': 'Missing required attribute: User_name'}

def test_add_task_missing_location(repo):
    # Test Case 8
    data = {
        'Description': 'Location not specified',
        'Due_date': '2024-08-01',
        'Priority': 'Medium',
        'Title': 'Task without location',
        'User_name': 'alex_lee'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': 'Missing required attribute: Location'}

def test_add_task_invalid_location_des_moines(repo):
    # Test Case 9
    data = {
        'Description': 'Location is Des Moines',
        'Due_date': '2024-07-20',
        'Location': 'Des Moines',
        'Priority': 'High',
        'Title': 'Invalid location task',
        'User_name': 'test_user'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': "Invalid location: must be 'Ames' or 'Boone'"}

def test_add_task_invalid_location_case(repo):
    # Test Case 10
    data = {
        'Description': "Location is lowercase 'ames'",
        'Due_date': '2024-07-25',
        'Location': 'ames',
        'Priority': 'Low',
        'Title': 'Case sensitive location',
        'User_name': 'case_test'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': "Invalid location: must be 'Ames' or 'Boone'"}

def test_add_task_invalid_location_empty_string(repo):
    # Test Case 11
    data = {
        'Description': 'Location is empty',
        'Due_date': '2024-07-30',
        'Location': '',
        'Priority': 'Low',
        'Title': 'Empty location',
        'User_name': 'empty_loc'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': "Invalid location: must be 'Ames' or 'Boone'"}

def test_add_task_all_fields_max_length(repo):
    # Test Case 12
    max_str = 'X' * 255
    data = {
        'Description': max_str,
        'Due_date': '2024-07-31',
        'Location': 'Ames',
        'Priority': max_str,
        'Title': max_str,
        'User_name': max_str
    }
    response, status = repo.add_task(data)
    assert status == 201
    assert response['Description'] == max_str
    assert response['Due_date'] == '2024-07-31'
    assert response['Location'] == 'Ames'
    assert response['Priority'] == max_str
    assert response['Title'] == max_str
    assert response['User_name'] == max_str
    assert 'id' in response

def test_add_task_duplicate_title(repo):
    # Test Case 13
    data1 = {
        'Description': 'First task with duplicate title',
        'Due_date': '2024-08-05',
        'Location': 'Boone',
        'Priority': 'Medium',
        'Title': 'Duplicate Title',
        'User_name': 'user1'
    }
    data2 = {
        'Description': 'Second task with duplicate title',
        'Due_date': '2024-08-06',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Duplicate Title',
        'User_name': 'user2'
    }
    response1, status1 = repo.add_task(data1)
    response2, status2 = repo.add_task(data2)
    assert status1 == 201
    assert status2 == 201
    assert response1['Title'] == 'Duplicate Title'
    assert response2['Title'] == 'Duplicate Title'
    assert response1['User_name'] == 'user1'
    assert response2['User_name'] == 'user2'
    assert response1['id'] != response2['id']

def test_add_task_invalid_due_date_format(repo):
    # Test Case 14
    data = {
        'Description': 'Date format not ISO',
        'Due_date': '31-07-2024',
        'Location': 'Ames',
        'Priority': 'High',
        'Title': 'Invalid Due Date',
        'User_name': 'user3'
    }
    response, status = repo.add_task(data)
    assert status == 400
    assert response == {'error': 'Invalid due date format. Expected YYYY-MM-DD.'}

def test_add_task_id_auto_increment(repo):
    # Test Case 15
    data1 = {
        'Description': 'First task',
        'Due_date': '2024-08-10',
        'Location': 'Ames',
        'Priority': 'Low',
        'Title': 'Task 1',
        'User_name': 'user1'
    }
    data2 = {
        'Description': 'Second task',
        'Due_date': '2024-08-11',
        'Location': 'Boone',
        'Priority': 'Medium',
        'Title': 'Task 2',
        'User_name': 'user2'
    }
    response1, status1 = repo.add_task(data1)
    response2, status2 = repo.add_task(data2)
    assert status1 == 201
    assert status2 == 201
    assert response1['id'] != response2['id']
    assert response2['id'] == response1['id'] + 1
    assert response1['Title'] == 'Task 1'
    assert response2['Title'] == 'Task 2'
