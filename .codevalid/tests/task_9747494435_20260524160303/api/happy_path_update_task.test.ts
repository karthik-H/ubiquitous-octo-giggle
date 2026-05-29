import request from 'supertest';
import { expect } from 'chai';

const loadFreshApp = async () => {
  jest.resetModules();
  const mod = await import('../../../../server/src/index');
  mod.resetState();
  return mod.app;
};

const seedEvent = async (app: any, overrides: Partial<Record<string, string>> = {}) => {
  const payload = {
    name: 'Seed Event',
    description: 'Seed event description',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    ...overrides,
  };

  const response = await request(app).post('/api/events').send(payload);
  expect(response.status).to.equal(201);
  return response.body;
};

const seedTask = async (
  app: any,
  eventId: string,
  overrides: Partial<Record<string, string>> = {},
) => {
  const payload = {
    title: 'Original Title',
    description: 'Original description',
    status: 'To Do',
    eventId,
    ...overrides,
  };

  const response = await request(app).post('/api/tasks').send(payload);
  expect(response.status).to.equal(201);
  return response.body;
};

describe('happy_path_update_task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PUT /api/tasks/:id updates a task with valid fields and a different existing event', async () => {
    const app = await loadFreshApp();
    const event1 = await seedEvent(app, { name: 'Event One' });
    const event2 = await seedEvent(app, { name: 'Event Two' });
    const task = await seedTask(app, event1.id);

    const response = await request(app).put(`/api/tasks/${task.id}`).send({
      title: 'Updated Title',
      description: 'New description',
      status: 'Completed',
      eventId: event2.id,
    });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: task.id,
      title: 'Updated Title',
      description: 'New description',
      status: 'Completed',
      eventId: event2.id,
    });

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.have.length(1);
    expect(listResponse.body[0]).to.deep.equal(response.body);
  });

  it('POST /api/tasks creates a task when the associated event exists', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);

    const response = await request(app).post('/api/tasks').send({
      title: 'Created Task',
      description: 'Task description',
      status: 'In Progress',
      eventId: event.id,
    });

    expect(response.status).to.equal(201);
    expect(response.body.id).to.be.a('string');
    expect(response.body.title).to.equal('Created Task');
    expect(response.body.description).to.equal('Task description');
    expect(response.body.status).to.equal('In Progress');
    expect(response.body.eventId).to.equal(event.id);
  });

  it('GET /api/tasks filters tasks by event_id query parameter', async () => {
    const app = await loadFreshApp();
    const event1 = await seedEvent(app, { name: 'Event A' });
    const event2 = await seedEvent(app, { name: 'Event B' });
    const task1 = await seedTask(app, event1.id, { title: 'Task A' });
    await seedTask(app, event2.id, { title: 'Task B' });

    const response = await request(app).get('/api/tasks').query({ event_id: event1.id });

    expect(response.status).to.equal(200);
    expect(response.body).to.have.length(1);
    expect(response.body[0].id).to.equal(task1.id);
    expect(response.body[0].eventId).to.equal(event1.id);
  });

  it('DELETE /api/tasks/:id removes an existing task and subsequent list excludes it', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);

    const deleteResponse = await request(app).delete(`/api/tasks/${task.id}`);
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
