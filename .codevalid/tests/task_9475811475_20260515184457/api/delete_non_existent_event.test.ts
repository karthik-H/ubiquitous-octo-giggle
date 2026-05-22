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

describe('delete_non_existent_event', () => {
  const loadFreshApp = async () => {
    jest.resetModules();
    latestApp = undefined;
    mockUuidV4.mockReset();
    mockUuidV4
      .mockReturnValueOnce('evt-2')
      .mockReturnValueOnce('task-2')
      .mockReturnValueOnce('evt-3')
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

  it('DELETE /api/events/:id returns 204 for a non-existent event and leaves existing data unchanged', async () => {
    const app = await loadFreshApp();

    const createEventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Existing Event',
        description: 'Should remain after noop delete',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
      });

    expect(createEventResponse.status).to.equal(201);
    expect(createEventResponse.body.id).to.equal('evt-2');

    const createTaskResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Existing Task',
        description: 'Should remain after noop delete',
        status: 'Completed',
        eventId: 'evt-2',
      });

    expect(createTaskResponse.status).to.equal(201);
    expect(createTaskResponse.body.id).to.equal('task-2');

    const deleteResponse = await request(app).delete('/api/events/evt-999');

    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const eventsResponse = await request(app).get('/api/events');
    expect(eventsResponse.status).to.equal(200);
    expect(eventsResponse.body).to.have.length(1);
    expect(eventsResponse.body[0]).to.include({
      id: 'evt-2',
      name: 'Existing Event',
      description: 'Should remain after noop delete',
    });

    const eventByIdResponse = await request(app).get('/api/events/evt-2');
    expect(eventByIdResponse.status).to.equal(200);
    expect(eventByIdResponse.body.id).to.equal('evt-2');

    const tasksResponse = await request(app).get('/api/tasks');
    expect(tasksResponse.status).to.equal(200);
    expect(tasksResponse.body).to.have.length(1);
    expect(tasksResponse.body[0]).to.include({
      id: 'task-2',
      eventId: 'evt-2',
      title: 'Existing Task',
    });

    const filteredTasksResponse = await request(app).get('/api/tasks').query({ event_id: 'evt-2' });
    expect(filteredTasksResponse.status).to.equal(200);
    expect(filteredTasksResponse.body).to.have.length(1);
    expect(filteredTasksResponse.body[0].id).to.equal('task-2');
  });

  it('GET /api/events/:id returns 404 for a missing event id', async () => {
    const app = await loadFreshApp();

    const response = await request(app).get('/api/events/evt-999');

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('POST /api/events and GET /api/events store and return event details', async () => {
    const app = await loadFreshApp();

    const createResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Stored Event',
        description: 'Persists in memory',
        startDate: '2026-10-10',
        endDate: '2026-10-11',
      });

    expect(createResponse.status).to.equal(201);
    expect(createResponse.body).to.deep.equal({
      id: 'evt-2',
      name: 'Stored Event',
      description: 'Persists in memory',
      startDate: '2026-10-10',
      endDate: '2026-10-11',
    });

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([
      {
        id: 'evt-2',
        name: 'Stored Event',
        description: 'Persists in memory',
        startDate: '2026-10-10',
        endDate: '2026-10-11',
      },
    ]);
  });

  it('PUT /api/events/:id updates an existing event while retaining its id', async () => {
    const app = await loadFreshApp();

    const createResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Before Update',
        description: 'Old description',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
      });

    expect(createResponse.status).to.equal(201);
    expect(createResponse.body.id).to.equal('evt-2');

    const updateResponse = await request(app)
      .put('/api/events/evt-2')
      .send({
        name: 'After Update',
        description: 'New description',
        startDate: '2026-11-03',
        endDate: '2026-11-04',
      });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body).to.deep.equal({
      id: 'evt-2',
      name: 'After Update',
      description: 'New description',
      startDate: '2026-11-03',
      endDate: '2026-11-04',
    });
  });

  it('DELETE /api/events/:id removes an existing event and cascades task cleanup after prior noop deletion coverage', async () => {
    const app = await loadFreshApp();

    const eventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Cascade Event',
        description: 'Delete target',
        startDate: '2026-12-01',
        endDate: '2026-12-02',
      });

    expect(eventResponse.status).to.equal(201);
    expect(eventResponse.body.id).to.equal('evt-2');

    const taskResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Cascade Task',
        description: 'Should be deleted',
        status: 'To Do',
        eventId: 'evt-2',
      });

    expect(taskResponse.status).to.equal(201);
    expect(taskResponse.body.id).to.equal('task-2');

    const noopDelete = await request(app).delete('/api/events/evt-999');
    expect(noopDelete.status).to.equal(204);

    const actualDelete = await request(app).delete('/api/events/evt-2');
    expect(actualDelete.status).to.equal(204);

    const eventsAfterDelete = await request(app).get('/api/events');
    expect(eventsAfterDelete.status).to.equal(200);
    expect(eventsAfterDelete.body).to.deep.equal([]);

    const tasksAfterDelete = await request(app).get('/api/tasks');
    expect(tasksAfterDelete.status).to.equal(200);
    expect(tasksAfterDelete.body).to.deep.equal([]);
  });

  it('POST /api/tasks validates required fields with 400', async () => {
    const app = await loadFreshApp();

    const response = await request(app)
      .post('/api/tasks')
      .send({
        description: 'Missing title, status, and eventId requirements',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Title, status, and eventId are required' });
  });
});
