import request from 'supertest';
import { expect } from 'chai';

describe('delete_nonexistent_task', () => {
  let app: any;
  let resetState: any;

  beforeEach(async () => {
    jest.resetModules();
    const serverModule = await import('../../../../server/src/index');
    app = serverModule.app;
    resetState = serverModule.resetState;
    resetState();
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
        startDate: '2026-02-01',
        endDate: '2026-02-02',
        ...overrides,
      });

    expect(response.status).to.equal(201);
    return response.body;
  };

  const createTask = async (eventId: string, overrides: Record<string, unknown> = {}) => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Existing Task',
        description: 'Still present after noop delete',
        status: 'To Do',
        eventId,
        ...overrides,
      });

    expect(response.status).to.equal(201);
    return response.body;
  };

  it('DELETE /api/tasks/:id returns 204 for a non-existent task and leaves existing tasks unchanged', async () => {
    const event = await createEvent();
    const task = await createTask(event.id, { title: 'Persistent Task' });

    const beforeDelete = await request(app).get('/api/tasks');
    expect(beforeDelete.status).to.equal(200);
    expect(beforeDelete.body).to.have.length(1);

    const deleteResponse = await request(app).delete('/api/tasks/999');
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const afterDelete = await request(app).get('/api/tasks');
    expect(afterDelete.status).to.equal(200);
    expect(afterDelete.body).to.have.length(1);
    expect(afterDelete.body[0].id).to.equal(task.id);
    expect(afterDelete.body[0].title).to.equal('Persistent Task');
  });

  it('DELETE /api/tasks/:id is idempotent when called repeatedly for the same missing id', async () => {
    const firstDelete = await request(app).delete('/api/tasks/missing-task');
    const secondDelete = await request(app).delete('/api/tasks/missing-task');

    expect(firstDelete.status).to.equal(204);
    expect(secondDelete.status).to.equal(204);

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.be.an('array');
    expect(listResponse.body).to.have.length(0);
  });

  it('GET /api/tasks returns all tasks and preserves them after deleting a different missing id', async () => {
    const event = await createEvent();
    const task1 = await createTask(event.id, { title: 'Task One' });
    const task2 = await createTask(event.id, { title: 'Task Two' });

    const deleteResponse = await request(app).delete('/api/tasks/not-here');
    expect(deleteResponse.status).to.equal(204);

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.have.length(2);
    expect(listResponse.body.map((item: any) => item.id)).to.have.members([task1.id, task2.id]);
  });

  it('GET /api/tasks with event_id filtering still returns matching tasks after noop delete', async () => {
    const eventA = await createEvent({ name: 'Alpha Event' });
    const eventB = await createEvent({ name: 'Beta Event' });
    await createTask(eventA.id, { title: 'Alpha Task' });
    await createTask(eventB.id, { title: 'Beta Task' });

    const deleteResponse = await request(app).delete('/api/tasks/999');
    expect(deleteResponse.status).to.equal(204);

    const filtered = await request(app).get(`/api/tasks?event_id=${eventB.id}`);
    expect(filtered.status).to.equal(200);
    expect(filtered.body).to.have.length(1);
    expect(filtered.body[0].title).to.equal('Beta Task');
    expect(filtered.body[0].eventId).to.equal(eventB.id);
  });

  it('POST /api/tasks can create a task with implemented fields before verifying noop deletion', async () => {
    const event = await createEvent({ name: 'Creation Event' });

    const createResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Created Task',
        description: 'Created successfully',
        status: 'In Progress',
        eventId: event.id,
      });

    expect(createResponse.status).to.equal(201);
    expect(createResponse.body.title).to.equal('Created Task');
    expect(createResponse.body.description).to.equal('Created successfully');
    expect(createResponse.body.status).to.equal('In Progress');
    expect(createResponse.body.eventId).to.equal(event.id);

    const deleteResponse = await request(app).delete('/api/tasks/nonexistent-after-create');
    expect(deleteResponse.status).to.equal(204);

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.body).to.have.length(1);
  });

  it('PUT /api/tasks/:id can update an existing task without changing eventId when eventId is omitted', async () => {
    const event = await createEvent({ name: 'Updatable Event' });
    const task = await createTask(event.id, {
      title: 'Before Update',
      description: 'Before Description',
      status: 'To Do',
    });

    const updateResponse = await request(app)
      .put(`/api/tasks/${task.id}`)
      .send({
        title: 'After Update',
        description: 'After Description',
        status: 'Completed',
      });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.id).to.equal(task.id);
    expect(updateResponse.body.title).to.equal('After Update');
    expect(updateResponse.body.description).to.equal('After Description');
    expect(updateResponse.body.status).to.equal('Completed');
    expect(updateResponse.body.eventId).to.equal(event.id);
  });

  it('PUT /api/tasks/:id returns 404 for a non-existent task', async () => {
    const response = await request(app)
      .put('/api/tasks/does-not-exist')
      .send({
        title: 'No Task',
        description: 'No task to update',
        status: 'Completed',
      });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Task not found' });
  });

  it('POST /api/tasks rejects requests tied to a missing event', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Invalid Event Task',
        description: 'Should fail',
        status: 'To Do',
        eventId: 'unknown-event',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });
  });
});
