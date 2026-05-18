import { expect } from 'chai';

describe('missing_required_field_startDate', () => {
  const port = 6103;
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

  const getJson = async (path: string) => {
    const res = await fetch(`${baseUrl}${path}`);
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

  it('returns 400 when startDate is missing from POST /api/events', async () => {
    const before = await getJson('/api/events');
    const created = await postJson('/api/events', {
      name: 'Missing Start Date',
      endDate: '2026-05-16',
    });
    const after = await getJson('/api/events');

    expect(created.res.status).to.equal(400);
    expect(created.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
    expect(after.body.length).to.equal(before.body.length);
  });

  it('supports creating and updating an event after startDate validation failure path is covered', async () => {
    const created = await postJson('/api/events', {
      name: 'Start Date Recovery Event',
      description: 'Created successfully',
      startDate: '2026-07-01',
      endDate: '2026-07-02',
    });

    expect(created.res.status).to.equal(201);

    const updated = await putJson(`/api/events/${created.body.id}`, {
      name: 'Start Date Recovery Event Updated',
      description: 'Updated successfully',
      startDate: '2026-07-03',
      endDate: '2026-07-04',
    });

    expect(updated.res.status).to.equal(200);
    expect(updated.body.name).to.equal('Start Date Recovery Event Updated');

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('lists events as an array from GET /api/events', async () => {
    const listed = await getJson('/api/events');
    expect(listed.res.status).to.equal(200);
    expect(Array.isArray(listed.body)).to.equal(true);
  });
});
