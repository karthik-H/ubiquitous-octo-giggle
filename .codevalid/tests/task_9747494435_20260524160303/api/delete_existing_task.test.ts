import request from 'supertest';
import { expect } from 'chai';

describe('delete_existing_task', () => {
  let app: any;

  beforeEach(async () => {
    jest.resetModules();
    const serverModule = await import('../../../../server/src/index');
    app = serverModule.app;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createEvent = async (overrides: Record<string, unknown> = {}) => {
    const response = await request(app)
      .post('/api/events')
      .send({
        name: 'Seed Event',
        description: 'Event for task tests',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        ...overrides,
      });

    expect(response.status).to.equal(201);
    return response.body;
  };

  const createTask = async (eventId: string, overrides: Record<string, unknown> = {}) => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Initial Task',
        description: 'Initial Description',
        status: 'To Do',
        eventId,
        ...overrides,
      });

    expect(response.status).to.equal(201);
    return response.body;
  };

  it('DELETE /api/tasks/:id removes an existing task and returns 204', async () => {
    const event = await createEvent();
    const task = await createTask(event.id, { title: 'Task To Delete' });

    const beforeDelete = await request(app).get('/api/tasks');
    expect(beforeDelete.status).to.equal(200);
    expect(beforeDelete.body).to.be.an('array');
    expect(beforeDelete.body.map((item: any) => item.id)).to.include(task.id);

    const deleteResponse = await request(app).delete(`/api/tasks/${task.id}`);

    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const afterDelete = await request(app).get('/api/tasks');
    expect(afterDelete.status).to.equal(200);
    expect(afterDelete.body.map((item: any) => item.id)).to.not.include(task.id);
  });

  it('GET /api/tasks with event_id only returns tasks for that event and reflects deletion', async () => {
    const eventA = await createEvent({ name: 'Event A' });
    const eventB = await createEvent({ name: 'Event B' });
    const taskA1 = await createTask(eventA.id, { title: 'A1' });
    await createTask(eventA.id, { title: 'A2' });
    await createTask(eventB.id, { title: 'B1' });

    const filteredBeforeDelete = await request(app).get(`/api/tasks?event_id=${eventA.id}`);
    expect(filteredBeforeDelete.status).to.equal(200);
    expect(filteredBeforeDelete.body).to.be.an('array');
    expect(filteredBeforeDelete.body).to.have.length(2);
    expect(filteredBeforeDelete.body.every((item: any) => item.eventId === eventA.id)).to.equal(true);

    const deleteResponse = await request(app).delete(`/api/tasks/${taskA1.id}`);
    expect(deleteResponse.status).to.equal(204);

    const filteredAfterDelete = await request(app).get(`/api/tasks?event_id=${eventA.id}`);
    expect(filteredAfterDelete.status).to.equal(200);
    expect(filteredAfterDelete.body).to.have.length(1);
    expect(filteredAfterDelete.body[0].title).to.equal('A2');
  });

  it('PUT /api/tasks/:id updates all implemented task fields before deletion', async () => {
    const originalEvent = await createEvent({ name: 'Original Event' });
    const newEvent = await createEvent({ name: 'New Event' });
    const task = await createTask(originalEvent.id, {
      title: 'Old Title',
      description: 'Old Description',
      status: 'To Do',
    });

    const updateResponse = await request(app)
      .put(`/api/tasks/${task.id}`)
      .send({
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'Completed',
        eventId: newEvent.id,
      });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.id).to.equal(task.id);
    expect(updateResponse.body.title).to.equal('Updated Title');
    expect(updateResponse.body.description).to.equal('Updated Description');
    expect(updateResponse.body.status).to.equal('Completed');
    expect(updateResponse.body.eventId).to.equal(newEvent.id);

    const listResponse = await request(app).get(`/api/tasks?event_id=${newEvent.id}`);
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body.map((item: any) => item.id)).to.include(task.id);
  });

  it('PUT /api/tasks/:id returns 404 when the task does not exist', async () => {
    const event = await createEvent();

    const response = await request(app)
      .put('/api/tasks/missing-task')
      .send({
        title: 'Updated',
        description: 'Updated Description',
        status: 'In Progress',
        eventId: event.id,
      });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Task not found' });
  });

  it('POST /api/tasks returns 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        description: 'Missing title, status, and eventId',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Title, status, and eventId are required' });
  });

  it('POST /api/tasks returns 400 when the associated event does not exist', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Orphan Task',
        description: 'No valid event',
        status: 'To Do',
        eventId: 'missing-event',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });
  });

  it('PUT /api/tasks/:id returns 400 when changing to a non-existent eventId', async () => {
    const event = await createEvent();
    const task = await createTask(event.id);

    const response = await request(app)
      .put(`/api/tasks/${task.id}`)
      .send({
        title: 'Retargeted Task',
        description: 'Attempt invalid event move',
        status: 'In Progress',
        eventId: 'missing-event',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });
  });
});
