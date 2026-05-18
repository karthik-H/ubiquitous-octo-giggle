import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('not_found_event_update', () => {
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

  it('returns 404 when updating a non-existent event id', async () => {
    await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02'
      });

    const response = await request(app)
      .put('/api/events/evt-999')
      .send({
        name: 'New Event'
      });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });

    const existing = await request(app).get('/api/events/evt-1');
    expect(existing.status).to.equal(200);
    expect(existing.body).to.deep.equal({
      id: 'evt-1',
      name: 'Meeting',
      description: 'Sync',
      startDate: '2023-10-01',
      endDate: '2023-10-02'
    });
  });

  it('returns 404 when fetching an event id that does not exist', async () => {
    const response = await request(app).get('/api/events/evt-404');

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('returns an empty list initially and keeps the list unchanged after failed update attempts', async () => {
    const initialList = await request(app).get('/api/events');
    expect(initialList.status).to.equal(200);
    expect(initialList.body).to.deep.equal([]);

    const failedUpdate = await request(app)
      .put('/api/events/evt-missing')
      .send({
        name: 'Ghost Event',
        description: 'Should not be created',
        startDate: '2025-01-01',
        endDate: '2025-01-02'
      });

    expect(failedUpdate.status).to.equal(404);

    const finalList = await request(app).get('/api/events');
    expect(finalList.status).to.equal(200);
    expect(finalList.body).to.deep.equal([]);
  });

  it('returns 204 when deleting a non-existent event and leaves data unchanged', async () => {
    const createResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Existing Event',
        description: 'Still here',
        startDate: '2025-02-01',
        endDate: '2025-02-02'
      });

    expect(createResponse.status).to.equal(201);

    const deleteResponse = await request(app).delete('/api/events/evt-999');
    expect(deleteResponse.status).to.equal(204);

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([
      {
        id: 'evt-1',
        name: 'Existing Event',
        description: 'Still here',
        startDate: '2025-02-01',
        endDate: '2025-02-02'
      }
    ]);
  });

  it('rejects task creation for a missing associated event', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Orphan task',
        description: 'No event',
        status: 'To Do',
        eventId: 'evt-999'
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });

    const tasksList = await request(app).get('/api/tasks');
    expect(tasksList.status).to.equal(200);
    expect(tasksList.body).to.deep.equal([]);
  });
});
