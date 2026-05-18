import { expect } from 'chai';

describe('missing_required_field_name', () => {
  const port = 6102;
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

  it('returns 400 when name is missing from POST /api/events', async () => {
    const before = await getJson('/api/events');
    const created = await postJson('/api/events', {
      startDate: '2026-05-15',
      endDate: '2026-05-16',
    });
    const after = await getJson('/api/events');

    expect(created.res.status).to.equal(400);
    expect(created.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
    expect(after.body.length).to.equal(before.body.length);
  });

  it('still allows valid creation after a validation failure', async () => {
    const created = await postJson('/api/events', {
      name: 'Recovery After Missing Name',
      description: 'Valid after invalid',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
    });

    expect(created.res.status).to.equal(201);
    expect(created.body.name).to.equal('Recovery After Missing Name');

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('returns 404 for GET /api/events/:id when id does not exist', async () => {
    const fetched = await getJson('/api/events/missing-required-field-name-id');
    expect(fetched.res.status).to.equal(404);
    expect(fetched.body).to.deep.equal({ error: 'Event not found' });
  });

  it('DELETE /api/events/:id is idempotent and returns 204 even when id does not exist', async () => {
    const deleted = await deleteReq('/api/events/does-not-exist');
    expect(deleted.res.status).to.equal(204);
  });
});
