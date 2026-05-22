const mockUuidV4 = jest.fn();
const capturedApps: any[] = [];

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  const expressFactory = () => {
    const app = actual();
    const originalListen = app.listen.bind(app);
    app.listen = jest.fn((...args: any[]) => {
      const callback = args.find((arg: unknown) => typeof arg === 'function');
      if (callback) {
        callback();
      }
      return {
        close: jest.fn(),
        address: jest.fn(),
      };
    });
    (app as any).__originalListen = originalListen;
    capturedApps.push(app);
    return app;
  };

  return {
    __esModule: true,
    ...actual,
    default: expressFactory,
  };
});

import request from 'supertest';
import { expect } from 'chai';

describe('happy_path_event_update', () => {
  let app: any;

  const loadFreshApp = () => {
    jest.isolateModules(() => {
      require('../../../../server/src/index');
    });
    app = capturedApps[capturedApps.length - 1];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedApps.length = 0;
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('generated-event-id');
    loadFreshApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates an existing event and returns the updated payload', async () => {
    const createResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02',
      });

    expect(createResponse.status).to.equal(201);
    expect(createResponse.body).to.deep.equal({
      id: 'generated-event-id',
      name: 'Meeting',
      description: 'Sync',
      startDate: '2023-10-01',
      endDate: '2023-10-02',
    });

    const updateResponse = await request(app)
      .put('/api/events/generated-event-id')
      .send({
        name: 'Updated Meeting',
        description: 'New sync',
        startDate: '2023-10-05',
        endDate: '2023-10-06',
      });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body).to.deep.equal({
      id: 'generated-event-id',
      name: 'Updated Meeting',
      description: 'New sync',
      startDate: '2023-10-05',
      endDate: '2023-10-06',
    });
  });

  it('creates an event with valid payload and exposes it through list and get endpoints', async () => {
    const createResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Launch Party',
        description: 'Product launch',
        startDate: '2024-01-10',
        endDate: '2024-01-11',
      });

    expect(createResponse.status).to.equal(201);
    expect(mockUuidV4.called).to.equal(undefined);
    expect(createResponse.body.id).to.equal('generated-event-id');
    expect(createResponse.body.name).to.equal('Launch Party');

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.have.length(1);
    expect(listResponse.body[0]).to.deep.equal(createResponse.body);

    const getResponse = await request(app).get('/api/events/generated-event-id');
    expect(getResponse.status).to.equal(200);
    expect(getResponse.body).to.deep.equal(createResponse.body);
  });

  it('returns 400 when creating an event without required fields', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({
        description: 'Missing required fields',
        endDate: '2024-02-01',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: 'Name, startDate, and endDate are required',
    });
  });

  it('returns 404 when getting an event that does not exist', async () => {
    const response = await request(app).get('/api/events/unknown-event');

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('deletes an event and removes its associated tasks', async () => {
    mockUuidV4
      .mockReturnValueOnce('event-1')
      .mockReturnValueOnce('task-1');

    const eventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Cleanup Event',
        description: 'Has tasks',
        startDate: '2024-03-01',
        endDate: '2024-03-02',
      });

    expect(eventResponse.status).to.equal(201);

    const taskResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Associated task',
        description: 'Will be removed',
        status: 'To Do',
        eventId: 'event-1',
      });

    expect(taskResponse.status).to.equal(201);
    expect(taskResponse.body.eventId).to.equal('event-1');

    const deleteResponse = await request(app).delete('/api/events/event-1');
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const getDeletedEvent = await request(app).get('/api/events/event-1');
    expect(getDeletedEvent.status).to.equal(404);
    expect(getDeletedEvent.body).to.deep.equal({ error: 'Event not found' });

    const tasksResponse = await request(app).get('/api/tasks?event_id=event-1');
    expect(tasksResponse.status).to.equal(200);
    expect(tasksResponse.body).to.deep.equal([]);
  });
});
