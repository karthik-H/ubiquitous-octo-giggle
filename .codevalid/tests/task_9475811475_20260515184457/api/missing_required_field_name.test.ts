const mockUuidV4 = jest.fn();

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

import request from 'supertest';
import { expect } from 'chai';

describe('missing_required_field_name', () => {
  const baseUrl = 'http://127.0.0.1:5001';

  const loadServer = async () => {
    jest.resetModules();
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('unused-id');
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
    mockUuidV4.mockReturnValue('unused-id');
  });

  afterEach(async () => {
    await clearEvents();
  });

  it('POST /api/events without name returns 400 and does not store an event', async () => {
    const response = await request(baseUrl).post('/api/events').send({
      startDate: '2026-05-20',
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

  it('GET /api/events/:id for a missing event returns 404', async () => {
    const response = await request(baseUrl).get('/api/events/non-existent-event');

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('PUT /api/events/:id on a missing event returns 404', async () => {
    const response = await request(baseUrl)
      .put('/api/events/non-existent-event')
      .send({
        name: 'Should Not Exist',
        description: 'No event present',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
      });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('DELETE /api/events/:id on a missing event still returns 204 and leaves list empty', async () => {
    const response = await request(baseUrl).delete('/api/events/non-existent-event');

    expect(response.status).to.equal(204);

    const listResponse = await request(baseUrl).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
