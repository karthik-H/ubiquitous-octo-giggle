import { expect } from 'chai';

describe('optional_field_description_missing', () => {
  const port = 6105;
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

  it('creates an event when description is omitted', async () => {
    const created = await postJson('/api/events', {
      name: 'Optional Description Event',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
    });

    expect(created.res.status).to.equal(201);
    expect(created.body.id).to.be.a('string');
    expect(created.body.name).to.equal('Optional Description Event');
    expect(created.body.startDate).to.equal('2026-10-01');
    expect(created.body.endDate).to.equal('2026-10-02');
    expect(Object.prototype.hasOwnProperty.call(created.body, 'description')).to.equal(true);

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('persists omitted description behavior when fetching the created event', async () => {
    const created = await postJson('/api/events', {
      name: 'Fetch Optional Description Event',
      startDate: '2026-11-01',
      endDate: '2026-11-02',
    });

    const fetched = await getJson(`/api/events/${created.body.id}`);
    expect(fetched.res.status).to.equal(200);
    expect(fetched.body.id).to.equal(created.body.id);
    expect(Object.prototype.hasOwnProperty.call(fetched.body, 'description')).to.equal(true);

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('can update an event created without description', async () => {
    const created = await postJson('/api/events', {
      name: 'Update Optional Description Event',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
    });

    const updated = await putJson(`/api/events/${created.body.id}`, {
      name: 'Updated Optional Description Event',
      description: 'Now has description',
      startDate: '2026-12-03',
      endDate: '2026-12-04',
    });

    expect(updated.res.status).to.equal(200);
    expect(updated.body.description).to.equal('Now has description');
    expect(updated.body.name).to.equal('Updated Optional Description Event');

    await deleteReq(`/api/events/${created.body.id}`);
  });
});
