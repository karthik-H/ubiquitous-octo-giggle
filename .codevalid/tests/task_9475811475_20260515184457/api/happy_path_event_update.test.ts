import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('happy_path_event_update', () => {
  let app: Express;
  let uuidSequence = 0;

  const buildApp = async (): Promise<Express> => {
    jest.resetModules();
    let capturedApp: Express | undefined;

    jest.doMock('uuid', () => ({
      v4: jest.fn(() => {
        uuidSequence += 1;
        return `evt-${uuidSequence}`;
      })
    }));

    jest.doMock('express', () => {
      const actual = jest.requireActual('express');
      const expressFactory = () => {
        const createdApp = actual.default();
        const originalListen = createdApp.listen.bind(createdApp);
        createdApp.listen = ((...args: unknown[]) => {
          const callback = args.find((arg) => typeof arg === 'function') as (() => void) | undefined;
          if (callback) callback();
          return {
            close: jest.fn()
          } as any;
        }) as typeof createdApp.listen;
        capturedApp = createdApp;
        return createdApp;
      };

      return {
        __esModule: true,
        ...actual,
        default: expressFactory
      };
    });

    await jest.isolateModulesAsync(async () => {
      await import('../../../server/src/index');
    });

    if (!capturedApp) {
      throw new Error('Failed to capture Express app instance');
    }

    return capturedApp;
  };

  beforeEach(async () => {
    uuidSequence = 0;
    jest.clearAllMocks();
    jest.restoreAllMocks();
    app = await buildApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('updates an existing event and returns the updated event object', async () => {
    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02'
      });

    expect(created.status).to.equal(201);
    expect(created.body.id).to.equal('evt-1');

    const response = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Updated Meeting',
        description: 'New sync',
        startDate: '2023-10-05',
        endDate: '2023-10-06'
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: 'evt-1',
      name: 'Updated Meeting',
      description: 'New sync',
      startDate: '2023-10-05',
      endDate: '2023-10-06'
    });

    const fetched = await request(app).get('/api/events/evt-1');
    expect(fetched.status).to.equal(200);
    expect(fetched.body).to.deep.equal(response.body);
  });

  it('lists created events and preserves updated values in the collection', async () => {
    await request(app)
      .post('/api/events')
      .send({
        name: 'Alpha Expo',
        description: 'Launch',
        startDate: '2024-01-10',
        endDate: '2024-01-11'
      });

    await request(app)
      .post('/api/events')
      .send({
        name: 'Beta Summit',
        description: 'Planning',
        startDate: '2024-02-10',
        endDate: '2024-02-11'
      });

    const updateResponse = await request(app)
      .put('/api/events/evt-2')
      .send({
        name: 'Beta Summit Revised',
        description: 'Planning updated',
        startDate: '2024-02-12',
        endDate: '2024-02-13'
      });

    expect(updateResponse.status).to.equal(200);

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.have.length(2);
    expect(listResponse.body).to.deep.equal([
      {
        id: 'evt-1',
        name: 'Alpha Expo',
        description: 'Launch',
        startDate: '2024-01-10',
        endDate: '2024-01-11'
      },
      {
        id: 'evt-2',
        name: 'Beta Summit Revised',
        description: 'Planning updated',
        startDate: '2024-02-12',
        endDate: '2024-02-13'
      }
    ]);
  });

  it('allows partial update payloads and sets omitted fields to undefined per implementation', async () => {
    await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02'
      });

    const response = await request(app)
      .put('/api/events/evt-1')
      .send({
        name: 'Name Only'
      });

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal('evt-1');
    expect(response.body.name).to.equal('Name Only');
    expect(response.body).to.have.property('description', undefined);
    expect(response.body).to.have.property('startDate', undefined);
    expect(response.body).to.have.property('endDate', undefined);
  });

  it('creates and deletes an event, removing associated tasks as part of event deletion', async () => {
    const eventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Cleanup Event',
        description: 'Has task',
        startDate: '2025-03-01',
        endDate: '2025-03-02'
      });

    expect(eventResponse.status).to.equal(201);

    const taskResponse = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Prepare room',
        description: 'Arrange chairs',
        status: 'To Do',
        eventId: eventResponse.body.id
      });

    expect(taskResponse.status).to.equal(201);

    const deleteResponse = await request(app).delete(`/api/events/${eventResponse.body.id}`);
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const eventFetch = await request(app).get(`/api/events/${eventResponse.body.id}`);
    expect(eventFetch.status).to.equal(404);
    expect(eventFetch.body).to.deep.equal({ error: 'Event not found' });

    const tasksForEvent = await request(app).get('/api/tasks').query({ event_id: eventResponse.body.id });
    expect(tasksForEvent.status).to.equal(200);
    expect(tasksForEvent.body).to.deep.equal([]);
  });

  it('returns 400 when creating an event without required fields', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({
        description: 'Missing required fields'
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
