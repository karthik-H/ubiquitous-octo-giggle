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
    name: 'Unicode Event',
    description: 'Event for serialization assertions',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
  });
  expect(response.status).to.equal(201);
  return response.body;
};

const seedTask = async (app: any, eventId: string) => {
  const response = await request(app).post('/api/tasks').send({
    title: 'Hello 🌍',
    description: '<script>alert(1)</script>',
    status: 'To Do',
    eventId,
  });
  expect(response.status).to.equal(201);
  return response.body;
};

describe('special_characters_in_response_serialized_as_json', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PUT /api/tasks/:id preserves unicode and script-tag text in JSON responses', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);

    const response = await request(app).put(`/api/tasks/${task.id}`).send({
      title: 'Hello 🌍',
      description: '<script>alert(1)</script>',
      status: 'Completed',
      eventId: event.id,
    });

    expect(response.status).to.equal(200);
    expect(response.body.title).to.equal('Hello 🌍');
    expect(response.body.description).to.equal('<script>alert(1)</script>');
    expect(response.body.status).to.equal('Completed');
    expect(response.text).to.contain('Hello 🌍');
    expect(response.text).to.contain('<script>alert(1)</script>');
  });

  it('POST /api/tasks serializes unicode and special characters without breaking response structure', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);

    const response = await request(app).post('/api/tasks').send({
      title: 'Snowman ☃️',
      description: 'Quotes: "double" and apostrophe\'s',
      status: 'In Progress',
      eventId: event.id,
    });

    expect(response.status).to.equal(201);
    expect(response.body.title).to.equal('Snowman ☃️');
    expect(response.body.description).to.equal('Quotes: "double" and apostrophe\'s');
    expect(response.body.eventId).to.equal(event.id);
  });

  it('GET /api/tasks returns serialized task objects containing special characters', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    await seedTask(app, event.id);

    const response = await request(app).get('/api/tasks');

    expect(response.status).to.equal(200);
    expect(response.body).to.have.length(1);
    expect(response.body[0].title).to.equal('Hello 🌍');
    expect(response.body[0].description).to.equal('<script>alert(1)</script>');
  });

  it('DELETE /api/tasks/:id removes a task that contains unicode and XSS-like text', async () => {
    const app = await loadFreshApp();
    const event = await seedEvent(app);
    const task = await seedTask(app, event.id);

    const deleteResponse = await request(app).delete(`/api/tasks/${task.id}`);
    expect(deleteResponse.status).to.equal(204);

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
