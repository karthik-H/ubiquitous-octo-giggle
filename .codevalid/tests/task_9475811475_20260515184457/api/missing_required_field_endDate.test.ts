import { expect } from 'chai';

describe('missing_required_field_endDate', () => {
  const port = 6104;
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

  it('returns 400 when endDate is missing from POST /api/events', async () => {
    const result = await postJson('/api/events', {
      name: 'Missing End Date',
      startDate: '2026-05-15',
    });

    expect(result.res.status).to.equal(400);
    expect(result.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
  });

  it('returns 404 when updating a missing event id', async () => {
    const updated = await putJson('/api/events/missing-end-date-update', {
      name: 'Does Not Exist',
      description: 'No event',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
    });

    expect(updated.res.status).to.equal(404);
    expect(updated.body).to.deep.equal({ error: 'Event not found' });
  });

  it('supports full create-get-delete lifecycle for a valid event', async () => {
    const created = await postJson('/api/events', {
      name: 'Lifecycle Event Missing EndDate Suite',
      description: 'Coverage lifecycle',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });

    expect(created.res.status).to.equal(201);

    const fetched = await getJson(`/api/events/${created.body.id}`);
    expect(fetched.res.status).to.equal(200);
    expect(fetched.body.id).to.equal(created.body.id);

    const deleted = await deleteReq(`/api/events/${created.body.id}`);
    expect(deleted.res.status).to.equal(204);
  });
});
