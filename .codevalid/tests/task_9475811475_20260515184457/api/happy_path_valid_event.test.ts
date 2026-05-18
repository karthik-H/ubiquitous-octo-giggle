import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('happy_path_valid_event', () => {
  const loadFreshApp = async (uuidValues: string[] = ['event-1', 'event-2', 'task-1']) => {
    jest.resetModules();
    jest.clearAllMocks();

    let capturedApp: Express | undefined;

    jest.doMock('express', () => {
      const actual = jest.requireActual('express');
      const factory = (() => {
        const app = actual();
        capturedApp = app;
        const originalListen = app.listen.bind(app);
        app.listen = ((...args: unknown[]) => {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') {
            (cb as () => void)();
          }
          return {
            close: () => undefined
          } as never;
        }) as typeof app.listen;
        return app;
      }) as typeof actual;

      Object.assign(factory, actual);
      factory.default = factory;
      return {
        __esModule: true,
        default: factory,
        ...actual
      };
    });

    let idx = 0;
    jest.doMock('uuid', () => ({
      v4: jest.fn(() => uuidValues[idx++] ?? `uuid-${idx}`)
    }));

    await import('../../../server/src/index');

    if (!capturedApp) {
      throw new Error('Express app was not captured from server/src/index.ts');
    }

    return capturedApp;
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('creates an event successfully and returns 201 with the stored event', async () => {
    const app = await loadFreshApp(['event-happy']);

    const res = await request(app)
      .post('/api/events')
      .send({
        name: 'Alpha Launch',
        description: 'Kickoff event',
        startDate: '2026-05-01',
        endDate: '2026-05-02'
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.deep.equal({
      id: 'event-happy',
      name: 'Alpha Launch',
      description: 'Kickoff event',
      startDate: '2026-05-01',
      endDate: '2026-05-02'
    });

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.deep.equal([res.body]);
  });

  it('supports full event lifecycle including fetch by id, update, and delete', async () => {
    const app = await loadFreshApp(['event-life']);

    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Bravo Event',
        description: 'Original',
        startDate: '2026-06-10',
        endDate: '2026-06-11'
      });

    expect(created.status).to.equal(201);

    const fetched = await request(app).get(`/api/events/${created.body.id}`);
    expect(fetched.status).to.equal(200);
    expect(fetched.body.name).to.equal('Bravo Event');

    const updated = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Bravo Event Updated',
        description: 'Changed',
        startDate: '2026-06-12',
        endDate: '2026-06-13'
      });

    expect(updated.status).to.equal(200);
    expect(updated.body).to.deep.equal({
      id: created.body.id,
      name: 'Bravo Event Updated',
      description: 'Changed',
      startDate: '2026-06-12',
      endDate: '2026-06-13'
    });

    const deleted = await request(app).delete(`/api/events/${created.body.id}`);
    expect(deleted.status).to.equal(204);
    expect(deleted.text).to.equal('');

    const missing = await request(app).get(`/api/events/${created.body.id}`);
    expect(missing.status).to.equal(404);
    expect(missing.body).to.deep.equal({ error: 'Event not found' });
  });

  it('deletes tasks associated with an event when the event is deleted', async () => {
    const app = await loadFreshApp(['event-task-cleanup', 'task-linked', 'task-unlinked']);

    const eventRes = await request(app)
      .post('/api/events')
      .send({
        name: 'Cleanup Event',
        description: 'Will be removed',
        startDate: '2026-07-01',
        endDate: '2026-07-02'
      });

    const otherEventRes = await request(app)
      .post('/api/events')
      .send({
        name: 'Other Event',
        description: 'Stays',
        startDate: '2026-07-03',
        endDate: '2026-07-04'
      });

    const linkedTask = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Linked Task',
        description: 'belongs to deleted event',
        status: 'To Do',
        eventId: eventRes.body.id
      });
    expect(linkedTask.status).to.equal(201);

    const unlinkedTask = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Other Task',
        description: 'belongs elsewhere',
        status: 'In Progress',
        eventId: otherEventRes.body.id
      });
    expect(unlinkedTask.status).to.equal(201);

    const deleted = await request(app).delete(`/api/events/${eventRes.body.id}`);
    expect(deleted.status).to.equal(204);

    const tasksAfter = await request(app).get('/api/tasks');
    expect(tasksAfter.status).to.equal(200);
    expect(tasksAfter.body).to.have.length(1);
    expect(tasksAfter.body[0].id).to.equal(unlinkedTask.body.id);
    expect(tasksAfter.body[0].eventId).to.equal(otherEventRes.body.id);
  });

  it('returns 404 when updating a non-existent event', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .put('/api/events/missing-event')
      .send({
        name: 'Missing',
        description: 'Nope',
        startDate: '2026-08-01',
        endDate: '2026-08-02'
      });

    expect(res.status).to.equal(404);
    expect(res.body).to.deep.equal({ error: 'Event not found' });
  });
});
