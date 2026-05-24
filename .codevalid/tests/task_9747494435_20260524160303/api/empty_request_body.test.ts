import request from 'supertest';
import { expect } from 'chai';

const loadFreshApp = async () => {
  jest.resetModules();
  const mod = await import('../../../../server/src/index');
  return mod.app;
};

const seedEvent = async (app: any) => {
  const response = await request(app).post('/api/events').send({
    name: 'Empty Body Event',
    description: 'Event for empty body tests',
    startDate: '2026-07-01',
    endDate: '2026-07-02',
  });
  expect(response.status).to.equal(201);
  return response.body;
};

const seedTask = async (app: any, eventId: string) => {
  const response = await request(app).post('/api/tasks').send({
    title: 'Old Title',
    description: 'Old Desc',
    status: 'To Do',
    eventId,
  });
  expect(response.status).to.equal(201);
  return response.body;
};

describe('empty_request_body', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PUT /api/tasks/:id accepts {} and returns 200', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);

    const response = await request(app).put(`/api/tasks/${task.id}`).send({});

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal(task.id);
    expect(response.body.eventId).to.equal(event.id);
  });

  it('GET /api/tasks shows the task still exists after an empty-body update', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);
    await request(app).put(`/api/tasks/${task.id}`).send({});

    const response = await request(app).get('/api/tasks');

    expect(response.status).to.equal(200);
    expect(response.body).to.have.length(1);
    expect(response.body[0].id).to.equal(task.id);
    expect(response.body[0].eventId).to.equal(event.id);
  });

  it('PUT /api/tasks/:id returns 404 for an unknown id even with an empty body', async () => {
    const app = await loadFreshApp();
    await seedEvent(app);

    const response = await request(app).put('/api/tasks/missing-id').send({});

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Task not found' });
  });

  it('DELETE /api/tasks/:id removes the task after an empty-body update', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);
    await request(app).put(`/api/tasks/${task.id}`).send({});

    const deleteResponse = await request(app).delete(`/api/tasks/${task.id}`);
    expect(deleteResponse.status).to.equal(204);

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
