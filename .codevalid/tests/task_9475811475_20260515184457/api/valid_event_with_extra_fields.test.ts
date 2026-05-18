import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('valid_event_with_extra_fields', () => {
  const loadFreshApp = async (uuidValues: string[] = ['event-extra']) => {
    jest.resetModules();
    jest.clearAllMocks();

    let capturedApp: Express | undefined;

    jest.doMock('express', () => {
      const actual = jest.requireActual('express');
      const factory = (() => {
        const app = actual();
        capturedApp = app;
        app.listen = ((...args: unknown[]) => {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') {
            (cb as () => void)();
          }
          return { close: () => undefined } as never;
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

  it('ignores unknown fields when creating a valid event', async () => {
    const app = await loadFreshApp(['event-extra']);

    const res = await request(app)
      .post('/api/events')
      .send({
        name: 'Extra Field Event',
        description: 'Core fields only',
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        location: 'Secret Room',
        unexpected: { nested: true }
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.deep.equal({
      id: 'event-extra',
      name: 'Extra Field Event',
      description: 'Core fields only',
      startDate: '2026-12-01',
      endDate: '2026-12-02'
    });
    expect(res.body.location).to.equal(undefined);
    expect(res.body.unexpected).to.equal(undefined);
  });

  it('persists only the supported event fields in list and get responses', async () => {
    const app = await loadFreshApp(['event-extra-list']);

    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Listed Event',
        description: 'Stored cleanly',
        startDate: '2026-12-03',
        endDate: '2026-12-04',
        owner: 'ignored-user'
      });

    const fetched = await request(app).get(`/api/events/${created.body.id}`);
    expect(fetched.status).to.equal(200);
    expect(fetched.body.owner).to.equal(undefined);
    expect(fetched.body.name).to.equal('Listed Event');

    const listed = await request(app).get('/api/events');
    expect(listed.status).to.equal(200);
    expect(listed.body).to.have.length(1);
    expect(listed.body[0].owner).to.equal(undefined);
  });

  it('allows updating supported fields while still not introducing unknown properties', async () => {
    const app = await loadFreshApp(['event-updatable']);

    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Update Extra Event',
        description: 'Before',
        startDate: '2026-12-10',
        endDate: '2026-12-11'
      });

    const updated = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Update Extra Event 2',
        description: 'After',
        startDate: '2026-12-12',
        endDate: '2026-12-13',
        location: 'ignored-again'
      });

    expect(updated.status).to.equal(200);
    expect(updated.body.id).to.equal(created.body.id);
    expect(updated.body.name).to.equal('Update Extra Event 2');
    expect(updated.body.location).to.equal(undefined);
  });

  it('covers task event lookup failure branch with a missing associated event', async () => {
    const app = await loadFreshApp();

    const taskRes = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Task without event',
        description: 'invalid',
        status: 'To Do',
        eventId: 'missing-event-id'
      });

    expect(taskRes.status).to.equal(400);
    expect(taskRes.body).to.deep.equal({ error: 'Associated event not found' });
  });
});
