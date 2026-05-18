import { expect } from 'chai';

describe('happy_path_valid_event', () => {
  const port = 6101;
  const baseUrl = `http://127.0.0.1:${port}`;

  const postJson = async (path: string, body: unknown) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : null };
  };

  const putJson = async (path: string, body: unknown) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : null };
  };

  const getJson = async (path: string) => {
    const res = await fetch(`${baseUrl}${path}`);
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : null };
  };

  const deleteReq = async (path: string) => {
    const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE' });
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : null };
  };

  beforeAll(async () => {
    process.env.PORT = String(port);
    await import('../../../../server/src/index');
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a valid event and returns 201 with stored event fields', async () => {
    const payload = {
      name: 'Alpha Launch happy_path_valid_event',
      description: 'Launch planning',
      startDate: '2026-05-15',
      endDate: '2026-05-16',
    };

    const { res, body } = await postJson('/api/events', payload);

    expect(res.status).to.equal(201);
    expect(body.id).to.be.a('string');
    expect(body.name).to.equal(payload.name);
    expect(body.description).to.equal(payload.description);
    expect(body.startDate).to.equal(payload.startDate);
    expect(body.endDate).to.equal(payload.endDate);

    const fetched = await getJson(`/api/events/${body.id}`);
    expect(fetched.res.status).to.equal(200);
    expect(fetched.body.id).to.equal(body.id);
    expect(fetched.body.name).to.equal(payload.name);

    await deleteReq(`/api/events/${body.id}`);
  });

  it('lists created events through GET /api/events', async () => {
    const created = await postJson('/api/events', {
      name: 'Bravo Listing happy_path_valid_event',
      description: 'List coverage',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
    });

    const listed = await getJson('/api/events');
    expect(listed.res.status).to.equal(200);
    expect(Array.isArray(listed.body)).to.equal(true);
    expect(listed.body.some((event: any) => event.id === created.body.id)).to.equal(true);

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('updates an existing event through PUT /api/events/:id', async () => {
    const created = await postJson('/api/events', {
      name: 'Charlie Update happy_path_valid_event',
      description: 'Before update',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
    });

    const updatePayload = {
      name: 'Charlie Update Revised happy_path_valid_event',
      description: 'After update',
      startDate: '2026-07-03',
      endDate: '2026-07-04',
    };

    const updated = await putJson(`/api/events/${created.body.id}`, updatePayload);
    expect(updated.res.status).to.equal(200);
    expect(updated.body.id).to.equal(created.body.id);
    expect(updated.body.name).to.equal(updatePayload.name);
    expect(updated.body.description).to.equal(updatePayload.description);
    expect(updated.body.startDate).to.equal(updatePayload.startDate);
    expect(updated.body.endDate).to.equal(updatePayload.endDate);

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('returns 404 when updating a missing event', async () => {
    const updated = await putJson('/api/events/non-existent-happy-path', {
      name: 'Missing',
      description: 'Missing',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
    });

    expect(updated.res.status).to.equal(404);
    expect(updated.body).to.deep.equal({ error: 'Event not found' });
  });

  it('deletes an existing event and then returns 404 on fetch', async () => {
    const created = await postJson('/api/events', {
      name: 'Delta Delete happy_path_valid_event',
      description: 'Delete coverage',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });

    const deleted = await deleteReq(`/api/events/${created.body.id}`);
    expect(deleted.res.status).to.equal(204);

    const fetched = await getJson(`/api/events/${created.body.id}`);
    expect(fetched.res.status).to.equal(404);
    expect(fetched.body).to.deep.equal({ error: 'Event not found' });
  });
});
