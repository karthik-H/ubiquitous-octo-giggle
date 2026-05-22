const mockUuidV4 = jest.fn();

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

import request from 'supertest';
import { expect } from 'chai';

describe('optional_field_description_missing', () => {
  const baseUrl = 'http://127.0.0.1:5001';

  const loadServer = async () => {
    jest.resetModules();
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('optional-default-id');
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
    mockUuidV4.mockReturnValue('optional-default-id');
  });

  afterEach(async () => {
    await clearEvents();
  });

  it('POST /api/events without description still returns 201 and omits description from serialized JSON', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('optional-event-1');

    const response = await request(baseUrl).post('/api/events').send({
      name: 'No Description Event',
      startDate: '2026-05-25',
      endDate: '2026-05-26',
    });

    expect(response.status).to.equal(201);
    expect(response.body.id).to.equal('optional-event-1');
    expect(response.body.name).to.equal('No Description Event');
    expect(response.body.startDate).to.equal('2026-05-25');
    expect(response.body.endDate).to.equal('2026-05-26');
    expect(response.body).to.not.have.property('description');
  });

  it('GET /api/events/:id preserves the created event without description', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('optional-event-2');

    await request(baseUrl).post('/api/events').send({
      name: 'Lookup Event',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
    });

    const response = await request(baseUrl).get('/api/events/optional-event-2');

    expect(response.status).to.equal(200);
    expect(response.body.id).to.equal('optional-event-2');
    expect(response.body.name).to.equal('Lookup Event');
    expect(response.body).to.not.have.property('description');
  });

  it('PUT /api/events/:id can later add a description to an event created without one', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('optional-event-3');

    await request(baseUrl).post('/api/events').send({
      name: 'Patchable Event',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
    });

    const response = await request(baseUrl)
      .put('/api/events/optional-event-3')
      .send({
        description: 'Added later',
        startDate: '2026-06-10',
        endDate: '2026-06-11',
        name: 'Patchable Event',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: 'optional-event-3',
      name: 'Patchable Event',
      description: 'Added later',
      startDate: '2026-06-10',
      endDate: '2026-06-11',
    });
  });

  it('GET /api/events returns events created without description', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('optional-event-4');

    await request(baseUrl).post('/api/events').send({
      name: 'List Without Description',
      startDate: '2026-07-01',
      endDate: '2026-07-01',
    });

    const response = await request(baseUrl).get('/api/events');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([
      {
        id: 'optional-event-4',
        name: 'List Without Description',
        startDate: '2026-07-01',
        endDate: '2026-07-01',
      },
    ]);
  });
});
