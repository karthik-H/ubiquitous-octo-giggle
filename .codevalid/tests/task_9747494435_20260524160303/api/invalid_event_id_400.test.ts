import request from 'supertest';
import { expect } from 'chai';

const loadFreshApp = async () => {
  jest.resetModules();
  const mod = await import('../../../../server/src/index');
  mod.resetState();
  return mod.app;
};

const seedEvent = async (app: any, name: string) => {
  const response = await request(app).post('/api/events').send({
    name,
    description: `${name} description`,
    startDate: '2026-03-01',
    endDate: '2026-03-02',
  });
  expect(response.status).to.equal(201);
  return response.body;
};

const seedTask = async (app: any, eventId: string) => {
  const response = await request(app).post('/api/tasks').send({
    title: 'Task To Update',
    description: 'Task description',
    status: 'To Do',
    eventId,
  });
  expect(response.status).to.equal(201);
  return response.body;
};

describe('invalid_event_id_400', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PUT /api/tasks/:id returns 400 when changing to a non-existent eventId', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app, 'Existing Event');
    const task = await seedTask(app, event.id);

    const response = await request(app).put(`/api/tasks/${task.id}`).send({
      eventId: 'e999',
    });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body[0].eventId).to.equal(event.id);
  });

  it('POST /api/tasks returns 400 when the associated event does not exist', async () => {
    const app = await loadFreshApp();

    const response = await request(app).post('/api/tasks').send({
      title: 'Impossible Task',
      description: 'No event',
      status: 'To Do',
      eventId: 'missing-event',
    });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });
  });

  it('PUT /api/tasks/:id succeeds when eventId is changed to another existing event', async () => {
    const app = await loadFreshApp();
    const event1 = await seedEvent(app, 'Event One');
    const event2 = await seedEvent(app, 'Event Two');
    const task = await seedTask(app, event1.id);

    const response = await request(app).put(`/api/tasks/${task.id}`).send({
      eventId: event2.id,
      title: 'Retargeted Task',
      description: 'Moved successfully',
      status: 'In Progress',
    });

    expect(response.status).to.equal(200);
    expect(response.body.eventId).to.equal(event2.id);
    expect(response.body.title).to.equal('Retargeted Task');
    expect(response.body.status).to.equal('In Progress');
  });

  it('GET /api/tasks with event_id returns an empty list for an event without tasks', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app, 'Lonely Event');

    const response = await request(app).get('/api/tasks').query({ event_id: event.id });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([]);
  });
});
