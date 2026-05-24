import request from 'supertest';
import { expect } from 'chai';

const loadFreshApp = async () => {
  jest.resetModules();
  const mod = await import('../../../../server/src/index');
  mod.resetState();
  return mod.app;
};

const seedEvent = async (app: any) => {
  const response = await request(app).post('/api/events').send({
    name: 'Partial Update Event',
    description: 'Used for partial update tests',
    startDate: '2026-04-01',
    endDate: '2026-04-02',
  });
  expect(response.status).to.equal(201);
  return response.body;
};

const seedTask = async (app: any, eventId: string, overrides: Partial<Record<string, string>> = {}) => {
  const response = await request(app).post('/api/tasks').send({
    title: 'Old Title',
    description: 'Old Desc',
    status: 'To Do',
    eventId,
    ...overrides,
  });
  expect(response.status).to.equal(201);
  return response.body;
};

describe('missing_fields_in_body', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PUT /api/tasks/:id with an empty object sets title, description, and status to undefined while preserving eventId', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);

    const response = await request(app).put(`/api/tasks/${task.id}`).send({});

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal(task.id);
    expect(response.body).to.not.have.property('title');
    expect(response.body).to.not.have.property('description');
    expect(response.body).to.not.have.property('status');
    expect(response.body.eventId).to.equal(event.id);
  });

  it('PUT /api/tasks/:id can update only one provided field while leaving eventId untouched', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);

    const response = await request(app).put(`/api/tasks/${task.id}`).send({
      title: 'Only Title Changed',
    });

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal(task.id);
    expect(response.body.title).to.equal('Only Title Changed');
    expect(response.body.eventId).to.equal(event.id);
    expect(response.body).to.not.have.property('description');
    expect(response.body).to.not.have.property('status');
  });

  it('GET /api/tasks returns the mutated shape after an empty-body update', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);
    await request(app).put(`/api/tasks/${task.id}`).send({});

    const response = await request(app).get('/api/tasks');

    expect(response.status).to.equal(200);
    expect(response.body).to.have.length(1);
    expect(response.body[0].id).to.equal(task.id);
    expect(response.body[0]).to.not.have.property('title');
    expect(response.body[0]).to.not.have.property('description');
    expect(response.body[0]).to.not.have.property('status');
    expect(response.body[0].eventId).to.equal(event.id);
  });

  it('DELETE /api/tasks/:id removes a task even after it has been updated with missing fields', async () => {
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
