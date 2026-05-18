import request from 'supertest';
import { expect } from 'chai';
import express from 'express';

describe('not_found_event_update', () => {
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

  it('returns 404 when updating a non-existent event ID', async () => {
    const seed = await request(app)
      .post('/api/events')
      .send({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02'
      });

    expect(seed.status).to.equal(201);

    const res = await request(app)
      .put('/api/events/evt-999')
      .send({
        name: 'New Event',
        description: 'Should fail',
        startDate: '2023-11-01',
        endDate: '2023-11-02'
      });

    expect(res.status).to.equal(404);
    expect(res.body).to.deep.equal({ error: 'Event not found' });

    const existing = await request(app).get(`/api/events/${seed.body.id}`);
    expect(existing.status).to.equal(200);
    expect(existing.body.name).to.equal('Meeting');
    expect(existing.body.description).to.equal('Sync');
  });

  it('returns 404 when fetching a non-existent event by id', async () => {
    const res = await request(app).get('/api/events/missing-event-id');

    expect(res.status).to.equal(404);
    expect(res.body).to.deep.equal({ error: 'Event not found' });
  });

  it('returns 204 when deleting a non-existent event and leaves event list unchanged', async () => {
    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Conference',
        description: 'Annual event',
        startDate: '2024-04-10',
        endDate: '2024-04-12'
      });

    expect(created.status).to.equal(201);

    const deleteRes = await request(app).delete('/api/events/does-not-exist');
    expect(deleteRes.status).to.equal(204);

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.have.length(1);
    expect(listRes.body[0].id).to.equal(created.body.id);
  });

  it('deletes associated tasks when an existing event is deleted', async () => {
    const createdEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Hackathon',
        description: 'Build sprint',
        startDate: '2024-05-01',
        endDate: '2024-05-02'
      });

    expect(createdEvent.status).to.equal(201);

    const createdTask = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Prepare agenda',
        description: 'Outline sessions',
        status: 'To Do',
        eventId: createdEvent.body.id
      });

    expect(createdTask.status).to.equal(201);

    const preDeleteTasks = await request(app)
      .get('/api/tasks')
      .query({ event_id: createdEvent.body.id });
    expect(preDeleteTasks.status).to.equal(200);
    expect(preDeleteTasks.body).to.have.length(1);

    const deleteRes = await request(app).delete(`/api/events/${createdEvent.body.id}`);
    expect(deleteRes.status).to.equal(204);

    const getDeletedEvent = await request(app).get(`/api/events/${createdEvent.body.id}`);
    expect(getDeletedEvent.status).to.equal(404);

    const postDeleteTasks = await request(app)
      .get('/api/tasks')
      .query({ event_id: createdEvent.body.id });
    expect(postDeleteTasks.status).to.equal(200);
    expect(postDeleteTasks.body).to.deep.equal([]);
  });
});
