import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('missing_required_field_name', () => {
  const loadFreshApp = async (uuidValues: string[] = ['event-1', 'event-2']) => {
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

  it('returns 400 when name is missing from event creation payload', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .post('/api/events')
      .send({ startDate: '2026-05-01', endDate: '2026-05-02' });

    expect(res.status).to.equal(400);
    expect(res.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.deep.equal([]);
  });

  it('returns 400 when name is an empty string', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .post('/api/events')
      .send({ name: '', startDate: '2026-05-01', endDate: '2026-05-02' });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal('Name, startDate, and endDate are required');
  });

  it('can still create a valid event after prior invalid requests', async () => {
    const app = await loadFreshApp(['event-valid-after-invalid']);

    await request(app)
      .post('/api/events')
      .send({ startDate: '2026-05-01', endDate: '2026-05-02' });

    const valid = await request(app)
      .post('/api/events')
      .send({
        name: 'Recovered Event',
        description: 'valid after invalid',
        startDate: '2026-05-03',
        endDate: '2026-05-04'
      });

    expect(valid.status).to.equal(201);
    expect(valid.body.id).to.equal('event-valid-after-invalid');

    const listRes = await request(app).get('/api/events');
    expect(listRes.body).to.have.length(1);
    expect(listRes.body[0].name).to.equal('Recovered Event');
  });

  it('returns 404 when fetching an unknown event id', async () => {
    const app = await loadFreshApp();

    const res = await request(app).get('/api/events/does-not-exist');
    expect(res.status).to.equal(404);
    expect(res.body).to.deep.equal({ error: 'Event not found' });
  });
});
