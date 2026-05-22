const mockUuidV4 = jest.fn();

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

import request from 'supertest';
import { expect } from 'chai';

describe('valid_event_with_extra_fields', () => {
  const baseUrl = 'http://127.0.0.1:5001';

  const loadServer = async () => {
    jest.resetModules();
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('extra-default-id');
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
    mockUuidV4.mockReturnValue('extra-default-id');
  });

  afterEach(async () => {
    await clearEvents();
  });

  it('POST /api/events ignores unknown fields and returns only event properties', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('extra-event-1');

    const response = await request(baseUrl).post('/api/events').send({
      name: 'Known Fields Only',
      description: 'Ignores extras',
      startDate: '2026-05-28',
      endDate: '2026-05-29',
      location: 'Hidden Venue',
      owner: 'Unexpected Owner',
    });

    expect(response.status).to.equal(201);
    expect(response.body).to.deep.equal({
      id: 'extra-event-1',
      name: 'Known Fields Only',
      description: 'Ignores extras',
      startDate: '2026-05-28',
      endDate: '2026-05-29',
    });
    expect(response.body).to.not.have.property('location');
    expect(response.body).to.not.have.property('owner');
  });

  it('GET /api/events also excludes unknown fields from stored events', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('extra-event-2');

    await request(baseUrl).post('/api/events').send({
      name: 'Stored Cleanly',
      description: 'No extras retained',
      startDate: '2026-06-05',
      endDate: '2026-06-06',
      metadata: { secret: true },
    });

    const response = await request(baseUrl).get('/api/events');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([
      {
        id: 'extra-event-2',
        name: 'Stored Cleanly',
        description: 'No extras retained',
        startDate: '2026-06-05',
        endDate: '2026-06-06',
      },
    ]);
    expect(response.body[0]).to.not.have.property('metadata');
  });

  it('PUT /api/events/:id can update known fields while ignoring new unknown ones', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('extra-event-3');

    await request(baseUrl).post('/api/events').send({
      name: 'Updatable Event',
      description: 'Before update',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
    });

    const response = await request(baseUrl)
      .put('/api/events/extra-event-3')
      .send({
        name: 'Updated Event',
        description: 'After update',
        startDate: '2026-06-12',
        endDate: '2026-06-13',
        unexpectedFlag: true,
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: 'extra-event-3',
      name: 'Updated Event',
      description: 'After update',
      startDate: '2026-06-12',
      endDate: '2026-06-13',
    });
    expect(response.body).to.not.have.property('unexpectedFlag');
  });

  it('DELETE /api/events/:id removes an event created from a payload containing extra fields', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('extra-event-4');

    await request(baseUrl).post('/api/events').send({
      name: 'Delete Me',
      description: 'Extra fields ignored',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      extraneous: 'value',
    });

    const deleteResponse = await request(baseUrl).delete('/api/events/extra-event-4');
    expect(deleteResponse.status).to.equal(204);

    const getResponse = await request(baseUrl).get('/api/events/extra-event-4');
    expect(getResponse.status).to.equal(404);
    expect(getResponse.body).to.deep.equal({ error: 'Event not found' });
  });
});
