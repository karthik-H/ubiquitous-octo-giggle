import request from 'supertest';
import { expect } from 'chai';

const loadFreshApp = async () => {
  jest.resetModules();
  const mod = await import('../../../../server/src/index');
  return mod.app;
};

const seedEvent = async (app: any) => {
  const response = await request(app).post('/api/events').send({
    name: 'Seed Event',
    description: 'Seed event description',
    startDate: '2026-02-01',
    endDate: '2026-02-02',
  });
  expect(response.status).to.equal(201);
  return response.body;
};

const seedTask = async (app: any, eventId: string) => {
  const response = await request(app).post('/api/tasks').send({
    title: 'Existing Task',
    description: 'Existing description',
    status: 'To Do',
    eventId,
  });
  expect(response.status).to.equal(201);
  return response.body;
};

describe('task_not_found_404', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PUT /api/tasks/:id returns 404 when the task does not exist', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    await seedTask(app, event.id);

    const response = await request(app).put('/api/tasks/t999').send({
      title: 'Updated',
      description: 'Updated description',
      status: 'Completed',
      eventId: event.id,
    });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Task not found' });
  });

  it('GET /api/tasks returns the seeded task list before any failed update', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);

    const response = await request(app).get('/api/tasks');

    expect(response.status).to.equal(200);
    expect(response.body).to.have.length(1);
    expect(response.body[0].id).to.equal(task.id);
    expect(response.body[0].title).to.equal('Existing Task');
  });

  it('DELETE /api/tasks/:id still returns 204 for a non-existent task id', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    await seedTask(app, event.id);

    const response = await request(app).delete('/api/tasks/does-not-exist');

    expect(response.status).to.equal(204);
    expect(response.text).to.equal('');

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.have.length(1);
  });

  it('POST /api/tasks returns 400 when required fields are missing', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);

    const response = await request(app).post('/api/tasks').send({
      description: 'Missing title and status',
      eventId: event.id,
    });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Title, status, and eventId are required' });
  });
});
