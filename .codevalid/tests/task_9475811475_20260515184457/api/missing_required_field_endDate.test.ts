const mockUuidV4 = jest.fn();

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

import request from 'supertest';
import { expect } from 'chai';

describe('missing_required_field_endDate', () => {
  const baseUrl = 'http://127.0.0.1:5001';

  const loadServer = async () => {
    jest.resetModules();
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('default-event-id');
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
    mockUuidV4.mockReturnValue('default-event-id');
  });

  afterEach(async () => {
    await clearEvents();
  });

  it('POST /api/events without endDate returns 400 and preserves empty storage', async () => {
    const response = await request(baseUrl).post('/api/events').send({
      name: 'Incomplete Event',
      startDate: '2026-05-20',
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

  it('PUT /api/events/:id updates only provided fields and leaves omitted ones undefined in the merged object', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('event-for-update');

    await request(baseUrl).post('/api/events').send({
      name: 'Original Event',
      description: 'Original description',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
    });

    const response = await request(baseUrl)
      .put('/api/events/event-for-update')
      .send({
        name: 'Renamed Event',
      });

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal('event-for-update');
    expect(response.body.name).to.equal('Renamed Event');
    expect(response.body).to.not.have.property('description');
    expect(response.body).to.not.have.property('startDate');
    expect(response.body).to.not.have.property('endDate');
  });

  it('GET /api/events/:id reflects the partial update result', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('event-for-get-after-update');

    await request(baseUrl).post('/api/events').send({
      name: 'Persisted Event',
      description: 'Before update',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
    });

    await request(baseUrl)
      .put('/api/events/event-for-get-after-update')
      .send({
        description: 'After update',
        endDate: '2026-06-12',
      });

    const response = await request(baseUrl).get('/api/events/event-for-get-after-update');

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal('event-for-get-after-update');
    expect(response.body.description).to.equal('After update');
    expect(response.body.endDate).to.equal('2026-06-12');
    expect(response.body).to.not.have.property('name');
    expect(response.body).to.not.have.property('startDate');
  });

  it('DELETE /api/events/:id for a missing event remains idempotent with 204', async () => {
    const response = await request(baseUrl).delete('/api/events/missing-delete-target');

    expect(response.status).to.equal(204);

    const listResponse = await request(baseUrl).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
