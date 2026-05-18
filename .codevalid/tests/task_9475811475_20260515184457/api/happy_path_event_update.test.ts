import request from 'supertest';
import { expect } from 'chai';
import express from 'express';

describe('happy_path_event_update', () => {
  let app: express.Express;
  let listenSpy: jest.SpyInstance;

  const loadFreshApp = async (): Promise<express.Express> => {
    jest.resetModules();

    listenSpy = jest
      .spyOn(express.application as any, 'listen')
      .mockImplementation(function mockedListen(this: express.Express, ...args: any[]) {
        const callback = args.find((arg) => typeof arg === 'function');
        if (callback) {
          callback();
        }
        return { close: jest.fn() } as any;
      });

    await import('../../../../server/src/index');

    expect(listenSpy.called).to.equal(true);
    return listenSpy.mock.instances[0] as express.Express;
  };

  beforeEach(async () => {
    app = await loadFreshApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('updates an existing event with valid ID and payload', async () => {
    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02'
      });

    expect(created.status).to.equal(201);
    expect(created.body.name).to.equal('Meeting');

    const res = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Updated Meeting',
        description: 'New sync',
        startDate: '2023-10-05',
        endDate: '2023-10-06'
      });

    expect(res.status).to.equal(200);
    expect(res.body.id).to.equal(created.body.id);
    expect(res.body.name).to.equal('Updated Meeting');
    expect(res.body.description).to.equal('New sync');
    expect(res.body.startDate).to.equal('2023-10-05');
    expect(res.body.endDate).to.equal('2023-10-06');

    const fetched = await request(app).get(`/api/events/${created.body.id}`);
    expect(fetched.status).to.equal(200);
    expect(fetched.body).to.deep.equal(res.body);
  });

  it('lists events and reflects the updated values after mutation', async () => {
    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Launch',
        description: 'Initial rollout',
        startDate: '2024-01-10',
        endDate: '2024-01-11'
      });

    expect(created.status).to.equal(201);

    const updated = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Launch Retrospective',
        description: 'Postmortem',
        startDate: '2024-01-12',
        endDate: '2024-01-13'
      });

    expect(updated.status).to.equal(200);

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.be.an('array');
    expect(listRes.body).to.have.length(1);
    expect(listRes.body[0].id).to.equal(created.body.id);
    expect(listRes.body[0].name).to.equal('Launch Retrospective');
    expect(listRes.body[0].description).to.equal('Postmortem');
    expect(listRes.body[0].startDate).to.equal('2024-01-12');
    expect(listRes.body[0].endDate).to.equal('2024-01-13');
  });

  it('allows partial update payloads and preserves unspecified event fields', async () => {
    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Workshop',
        description: 'Hands-on session',
        startDate: '2024-02-01',
        endDate: '2024-02-02'
      });

    expect(created.status).to.equal(201);

    const res = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Advanced Workshop'
      });

    expect(res.status).to.equal(200);
    expect(res.body.id).to.equal(created.body.id);
    expect(res.body.name).to.equal('Advanced Workshop');
    expect(res.body.description).to.equal('Hands-on session');
    expect(res.body.startDate).to.equal('2024-02-01');
    expect(res.body.endDate).to.equal('2024-02-02');
  });

  it('returns 400 when creating an event without required fields', async () => {
    const missingName = await request(app)
      .post('/api/events')
      .send({ startDate: '2024-03-01', endDate: '2024-03-02' });

    expect(missingName.status).to.equal(400);
    expect(missingName.body).to.deep.equal({
      error: 'Name, startDate, and endDate are required'
    });

    const missingStartDate = await request(app)
      .post('/api/events')
      .send({ name: 'No start', endDate: '2024-03-02' });

    expect(missingStartDate.status).to.equal(400);

    const missingEndDate = await request(app)
      .post('/api/events')
      .send({ name: 'No end', startDate: '2024-03-01' });

    expect(missingEndDate.status).to.equal(400);
  });
});
