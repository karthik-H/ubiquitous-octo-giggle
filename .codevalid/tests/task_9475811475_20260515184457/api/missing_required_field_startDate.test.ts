const mockUuidV4 = jest.fn();

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

import request from 'supertest';
import { expect } from 'chai';

describe('missing_required_field_startDate', () => {
  const baseUrl = 'http://127.0.0.1:5001';

  const loadServer = async () => {
    jest.resetModules();
    mockUuidV4.mockReset();
    mockUuidV4
      .mockReturnValueOnce('seed-event-1')
      .mockReturnValue('seed-event-default');
    require('../../../server/src/index');
    await new Promise((resolve) => setTimeout(resolve, 50));
  };

  const clearEvents = async () => {
    const listResponse = await request(baseUrl).get('/api/events');
    if (listResponse.status === 200 && Array.isArray(listResponse.body)) {
      for (const event of listResponse.body) {
        await request(baseUrl).delete(`/api/events/${event.id}`);
      }
    }
  };

  beforeAll(async () => {
    await loadServer();
  });

  beforeEach(async () => {
    await clearEvents();
    jest.clearAllMocks();
    mockUuidV4.mockReturnValue('seed-event-default');
  });

  afterEach(async () => {
    await clearEvents();
  });

  it('POST /api/events without startDate returns 400 and no event is created', async () => {
    const response = await request(baseUrl).post('/api/events').send({
      name: 'Alpha Event',
      endDate: '2026-05-21',
    });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: 'Name, startDate, and endDate are required',
    });
    expect(mockUuidV4.callCount).to.equal(0);

    const listResponse = await request(baseUrl).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });

  it('POST /api/events with valid payload after a failed request still succeeds', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('seed-event-1');

    const response = await request(baseUrl).post('/api/events').send({
      name: 'Recovered Event',
      description: 'Created after validation failure',
      startDate: '2026-05-22',
      endDate: '2026-05-23',
    });

    expect(response.status).to.equal(201);
    expect(response.body).to.deep.equal({
      id: 'seed-event-1',
      name: 'Recovered Event',
      description: 'Created after validation failure',
      startDate: '2026-05-22',
      endDate: '2026-05-23',
    });
  });

  it('GET /api/events returns the created event list after successful creation', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('seed-event-list');

    await request(baseUrl).post('/api/events').send({
      name: 'Listable Event',
      description: 'Visible in listing',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
    });

    const response = await request(baseUrl).get('/api/events');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([
      {
        id: 'seed-event-list',
        name: 'Listable Event',
        description: 'Visible in listing',
        startDate: '2026-06-10',
        endDate: '2026-06-11',
      },
    ]);
  });

  it('DELETE /api/events/:id removes the created event and makes subsequent GET return 404', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('seed-event-delete');

    await request(baseUrl).post('/api/events').send({
      name: 'Disposable Event',
      description: 'To be deleted',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
    });

    const deleteResponse = await request(baseUrl).delete('/api/events/seed-event-delete');
    expect(deleteResponse.status).to.equal(204);

    const getResponse = await request(baseUrl).get('/api/events/seed-event-delete');
    expect(getResponse.status).to.equal(404);
    expect(getResponse.body).to.deep.equal({ error: 'Event not found' });
  });
});
