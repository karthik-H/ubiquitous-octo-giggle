const mockUuidV4 = jest.fn();

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

import request from 'supertest';
import { expect } from 'chai';

describe('happy_path_valid_event', () => {
  const baseUrl = 'http://127.0.0.1:5001';

  const loadServer = async () => {
    jest.resetModules();
    mockUuidV4.mockReset();
    mockUuidV4
      .mockReturnValueOnce('event-create-1')
      .mockReturnValueOnce('event-create-2')
      .mockReturnValueOnce('event-create-3')
      .mockReturnValueOnce('event-create-4')
      .mockReturnValueOnce('event-create-5')
      .mockReturnValue('event-default');
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
  });

  afterEach(async () => {
    await clearEvents();
    jest.clearAllMocks();
  });

  it('POST /api/events with valid payload returns 201 and persists the event', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('event-happy-1');

    const payload = {
      name: 'Alpha Launch',
      description: 'Kickoff event',
      startDate: '2026-05-20',
      endDate: '2026-05-21',
    };

    const createResponse = await request(baseUrl).post('/api/events').send(payload);

    expect(createResponse.status).to.equal(201);
    expect(createResponse.body).to.deep.equal({
      id: 'event-happy-1',
      ...payload,
    });
    expect(mockUuidV4.callCount).to.equal(1);

    const listResponse = await request(baseUrl).get('/api/events');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([
      {
        id: 'event-happy-1',
        ...payload,
      },
    ]);
  });

  it('GET /api/events/:id returns the stored event after creation', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('event-happy-2');

    await request(baseUrl).post('/api/events').send({
      name: 'Bravo Summit',
      description: 'Annual meeting',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
    });

    const getResponse = await request(baseUrl).get('/api/events/event-happy-2');

    expect(getResponse.status).to.equal(200);
    expect(getResponse.body).to.deep.equal({
      id: 'event-happy-2',
      name: 'Bravo Summit',
      description: 'Annual meeting',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
    });
  });

  it('PUT /api/events/:id updates stored event details', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('event-happy-3');

    await request(baseUrl).post('/api/events').send({
      name: 'Gamma Expo',
      description: 'Original description',
      startDate: '2026-07-10',
      endDate: '2026-07-11',
    });

    const updateResponse = await request(baseUrl)
      .put('/api/events/event-happy-3')
      .send({
        name: 'Gamma Expo Updated',
        description: 'Updated description',
        startDate: '2026-07-12',
        endDate: '2026-07-13',
      });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body).to.deep.equal({
      id: 'event-happy-3',
      name: 'Gamma Expo Updated',
      description: 'Updated description',
      startDate: '2026-07-12',
      endDate: '2026-07-13',
    });

    const getResponse = await request(baseUrl).get('/api/events/event-happy-3');
    expect(getResponse.status).to.equal(200);
    expect(getResponse.body.name).to.equal('Gamma Expo Updated');
    expect(getResponse.body.description).to.equal('Updated description');
  });

  it('DELETE /api/events/:id removes a stored event', async () => {
    mockUuidV4.mockReset();
    mockUuidV4.mockReturnValue('event-happy-4');

    await request(baseUrl).post('/api/events').send({
      name: 'Delta Meetup',
      description: 'Networking',
      startDate: '2026-08-01',
      endDate: '2026-08-01',
    });

    const deleteResponse = await request(baseUrl).delete('/api/events/event-happy-4');
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const getResponse = await request(baseUrl).get('/api/events/event-happy-4');
    expect(getResponse.status).to.equal(404);
    expect(getResponse.body).to.deep.equal({ error: 'Event not found' });
  });

  it('GET /api/events returns multiple created events in insertion order', async () => {
    mockUuidV4.mockReset();
    mockUuidV4
      .mockReturnValueOnce('event-happy-5a')
      .mockReturnValueOnce('event-happy-5b');

    await request(baseUrl).post('/api/events').send({
      name: 'Echo One',
      description: 'First',
      startDate: '2026-09-01',
      endDate: '2026-09-01',
    });
    await request(baseUrl).post('/api/events').send({
      name: 'Echo Two',
      description: 'Second',
      startDate: '2026-09-02',
      endDate: '2026-09-02',
    });

    const listResponse = await request(baseUrl).get('/api/events');

    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([
      {
        id: 'event-happy-5a',
        name: 'Echo One',
        description: 'First',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      },
      {
        id: 'event-happy-5b',
        name: 'Echo Two',
        description: 'Second',
        startDate: '2026-09-02',
        endDate: '2026-09-02',
      },
    ]);
  });
});
