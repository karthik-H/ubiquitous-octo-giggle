const mockUuidV4 = jest.fn();
const capturedApps: any[] = [];

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  const expressFactory = () => {
    const app = actual();
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

describe('not_found_event_update', () => {
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
    mockUuidV4.mockReturnValue('evt-123');
    loadFreshApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when updating a non-existent event id', async () => {
    const createResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02',
      });

    expect(createResponse.status).to.equal(201);

    const response = await request(app)
      .put('/api/events/evt-999')
      .send({
        name: 'New Event',
        description: 'Still missing',
        startDate: '2023-11-01',
        endDate: '2023-11-02',
      });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });

    const originalEvent = await request(app).get('/api/events/evt-123');
    expect(originalEvent.status).to.equal(200);
    expect(originalEvent.body.name).to.equal('Meeting');
  });

  it('returns 404 when updating with partial payload for a non-existent id', async () => {
    const response = await request(app)
      .put('/api/events/missing-id')
      .send({ name: 'Only Name Provided' });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('lists created events and preserves state isolation per test load', async () => {
    const initialList = await request(app).get('/api/events');
    expect(initialList.status).to.equal(200);
    expect(initialList.body).to.deep.equal([]);

    const createResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Conference',
        description: 'Annual meetup',
        startDate: '2024-04-10',
        endDate: '2024-04-12',
      });

    expect(createResponse.status).to.equal(201);

    const listResponse = await request(app).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.have.length(1);
    expect(listResponse.body[0].id).to.equal('evt-123');
  });

  it('updates an existing event successfully to cover the success branch too', async () => {
    await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02',
      });

    const response = await request(app)
      .put('/api/events/evt-123')
      .send({
        name: 'Updated Meeting',
        description: 'Updated description',
        startDate: '2023-10-05',
        endDate: '2023-10-06',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: 'evt-123',
      name: 'Updated Meeting',
      description: 'Updated description',
      startDate: '2023-10-05',
      endDate: '2023-10-06',
    });
  });

  it('deletes events idempotently and returns 204 even when the id does not exist', async () => {
    const missingDelete = await request(app).delete('/api/events/does-not-exist');
    expect(missingDelete.status).to.equal(204);

    await request(app)
      .post('/api/events')
      .send({
        name: 'Delete Me',
        description: 'Temporary',
        startDate: '2024-05-01',
        endDate: '2024-05-02',
      });

    const existingDelete = await request(app).delete('/api/events/evt-123');
    expect(existingDelete.status).to.equal(204);

    const getDeleted = await request(app).get('/api/events/evt-123');
    expect(getDeleted.status).to.equal(404);
    expect(getDeleted.body).to.deep.equal({ error: 'Event not found' });
  });
});
