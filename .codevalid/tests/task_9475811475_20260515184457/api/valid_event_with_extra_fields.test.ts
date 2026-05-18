import { expect } from 'chai';

describe('valid_event_with_extra_fields', () => {
  const port = 6106;
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

  it('ignores extra fields during valid event creation', async () => {
    const created = await postJson('/api/events', {
      name: 'Extra Field Event',
      description: 'Known field',
      startDate: '2027-01-01',
      endDate: '2027-01-02',
      location: 'Hidden Venue',
      owner: 'Ignored User',
    });

    expect(created.res.status).to.equal(201);
    expect(created.body.id).to.be.a('string');
    expect(created.body.name).to.equal('Extra Field Event');
    expect(created.body.description).to.equal('Known field');
    expect(created.body.startDate).to.equal('2027-01-01');
    expect(created.body.endDate).to.equal('2027-01-02');
    expect(Object.prototype.hasOwnProperty.call(created.body, 'location')).to.equal(false);
    expect(Object.prototype.hasOwnProperty.call(created.body, 'owner')).to.equal(false);

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('stores and returns only supported fields when listing events', async () => {
    const created = await postJson('/api/events', {
      name: 'Listed Extra Field Event',
      description: 'List verification',
      startDate: '2027-02-01',
      endDate: '2027-02-02',
      ignored: 'value',
    });

    const listed = await getJson('/api/events');
    expect(listed.res.status).to.equal(200);
    const event = listed.body.find((item: any) => item.id === created.body.id);
    expect(event.name).to.equal('Listed Extra Field Event');
    expect(Object.prototype.hasOwnProperty.call(event, 'ignored')).to.equal(false);

    await deleteReq(`/api/events/${created.body.id}`);
  });

  it('returns 400 when required fields are absent even if extra fields are present', async () => {
    const created = await postJson('/api/events', {
      description: 'Missing required fields',
      location: 'Nowhere',
    });

    expect(created.res.status).to.equal(400);
    expect(created.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
  });
});
