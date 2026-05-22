const mockUuidV4 = jest.fn();
let latestApp: any;

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  const expressFn = (...args: any[]) => {
    const app = actual(...args);
    latestApp = app;
    app.listen = jest.fn((_port?: any, cb?: any) => {
      if (typeof cb === 'function') {
        cb();
      }
      return { close: jest.fn() };
    });
    return app;
  };

  Object.assign(expressFn, actual);
  expressFn.default = expressFn;
  return expressFn;
});

import request from 'supertest';
import { expect } from 'chai';

describe('delete_existing_event', () => {
  const loadFreshApp = async () => {
    jest.resetModules();
    latestApp = undefined;
    mockUuidV4.mockReset();
    mockUuidV4
      .mockReturnValueOnce('evt-1')
      .mockReturnValueOnce('task-1')
      .mockReturnValueOnce('evt-2')
      .mockReturnValueOnce('task-2')
      .mockReturnValue('fallback-id');

    await import('../../../server/src/index');
    return latestApp;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('DELETE /api/events/:id removes an existing event and its associated tasks, returning 204', async () => {
    const app = await loadFreshApp();

    const createEventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Event Alpha',
        description: 'Primary event',
        startDate: '2026-05-01',
        endDate: '2026-05-02',
      });

    expect(createEventResponse.status).to.equal(201);
    expect(createEventResponse.body.id).to.equal('evt-1');

    const createTaskResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Task linked to deleted event',
        description: 'Should be removed with event',
        status: 'To Do',
        eventId: 'evt-1',
      });

    expect(createTaskResponse.status).to.equal(201);
    expect(createTaskResponse.body.id).to.equal('task-1');
    expect(createTaskResponse.body.eventId).to.equal('evt-1');

    const deleteResponse = await request(app).delete('/api/events/evt-1');

    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const eventsAfterDelete = await request(app).get('/api/events');
    expect(eventsAfterDelete.status).to.equal(200);
    expect(eventsAfterDelete.body).to.deep.equal([]);

    const deletedEventLookup = await request(app).get('/api/events/evt-1');
    expect(deletedEventLookup.status).to.equal(404);
    expect(deletedEventLookup.body).to.deep.equal({ error: 'Event not found' });

    const tasksAfterDelete = await request(app).get('/api/tasks');
    expect(tasksAfterDelete.status).to.equal(200);
    expect(tasksAfterDelete.body).to.deep.equal([]);

    const filteredTasksAfterDelete = await request(app).get('/api/tasks').query({ event_id: 'evt-1' });
    expect(filteredTasksAfterDelete.status).to.equal(200);
    expect(filteredTasksAfterDelete.body).to.deep.equal([]);
  });

  it('POST /api/events rejects missing required fields with 400', async () => {
    const app = await loadFreshApp();

    const response = await request(app)
      .post('/api/events')
      .send({
        description: 'Missing required fields',
        startDate: '2026-05-01',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });

  it('GET and PUT event routes return created data and updated event details for an existing id', async () => {
    const app = await loadFreshApp();

    const createEventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Launch Day',
        description: 'Original description',
        startDate: '2026-06-10',
        endDate: '2026-06-11',
      });

    expect(createEventResponse.status).to.equal(201);
    expect(createEventResponse.body).to.include({
      id: 'evt-1',
      name: 'Launch Day',
      description: 'Original description',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
    });

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.have.length(1);
    expect(listResponse.body[0].id).to.equal('evt-1');

    const getByIdResponse = await request(app).get('/api/events/evt-1');
    expect(getByIdResponse.status).to.equal(200);
    expect(getByIdResponse.body.name).to.equal('Launch Day');

    const updateResponse = await request(app)
      .put('/api/events/evt-1')
      .send({
        name: 'Launch Day Updated',
        description: 'Updated description',
        startDate: '2026-06-12',
        endDate: '2026-06-13',
      });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body).to.deep.equal({
      id: 'evt-1',
      name: 'Launch Day Updated',
      description: 'Updated description',
      startDate: '2026-06-12',
      endDate: '2026-06-13',
    });

    const getUpdatedResponse = await request(app).get('/api/events/evt-1');
    expect(getUpdatedResponse.status).to.equal(200);
    expect(getUpdatedResponse.body.name).to.equal('Launch Day Updated');
    expect(getUpdatedResponse.body.description).to.equal('Updated description');
  });

  it('PUT /api/events/:id returns 404 for a missing event', async () => {
    const app = await loadFreshApp();

    const response = await request(app)
      .put('/api/events/missing-event')
      .send({
        name: 'Does not exist',
        description: 'No record',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
      });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('task routes enforce event existence and support list filtering before cascade deletion', async () => {
    const app = await loadFreshApp();

    const invalidTaskResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Orphan task',
        description: 'Should fail',
        status: 'To Do',
        eventId: 'missing-event',
      });

    expect(invalidTaskResponse.status).to.equal(400);
    expect(invalidTaskResponse.body).to.deep.equal({ error: 'Associated event not found' });

    const createEventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Filterable Event',
        description: 'For task listing',
        startDate: '2026-08-01',
        endDate: '2026-08-02',
      });

    expect(createEventResponse.status).to.equal(201);
    expect(createEventResponse.body.id).to.equal('evt-1');

    const createTaskResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Scoped task',
        description: 'Matches event query',
        status: 'In Progress',
        eventId: 'evt-1',
      });

    expect(createTaskResponse.status).to.equal(201);
    expect(createTaskResponse.body.id).to.equal('task-1');

    const filteredResponse = await request(app).get('/api/tasks').query({ event_id: 'evt-1' });
    expect(filteredResponse.status).to.equal(200);
    expect(filteredResponse.body).to.have.length(1);
    expect(filteredResponse.body[0]).to.include({ id: 'task-1', eventId: 'evt-1' });

    const deleteResponse = await request(app).delete('/api/events/evt-1');
    expect(deleteResponse.status).to.equal(204);

    const tasksAfterDelete = await request(app).get('/api/tasks').query({ event_id: 'evt-1' });
    expect(tasksAfterDelete.status).to.equal(200);
    expect(tasksAfterDelete.body).to.deep.equal([]);
  });
});
