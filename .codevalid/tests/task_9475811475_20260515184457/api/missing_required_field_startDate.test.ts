import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('missing_required_field_startDate', () => {
  const loadFreshApp = async (uuidValues: string[] = ['event-1']) => {
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

  it('returns 400 when startDate is missing', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .post('/api/events')
      .send({ name: 'No Start', endDate: '2026-09-02' });

    expect(res.status).to.equal(400);
    expect(res.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
  });

  it('returns 400 when startDate is an empty string', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .post('/api/events')
      .send({ name: 'Empty Start', startDate: '', endDate: '2026-09-02' });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal('Name, startDate, and endDate are required');
  });

  it('lists events as empty when only invalid create attempts were made', async () => {
    const app = await loadFreshApp();

    await request(app)
      .post('/api/events')
      .send({ name: 'No Start', endDate: '2026-09-02' });

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.deep.equal([]);
  });

  it('allows create then update flow for a valid event in the same route module', async () => {
    const app = await loadFreshApp(['event-updateable']);

    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Create Me',
        description: 'before update',
        startDate: '2026-09-10',
        endDate: '2026-09-11'
      });

    expect(created.status).to.equal(201);

    const updated = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Create Me Updated',
        description: 'after update',
        startDate: '2026-09-12',
        endDate: '2026-09-13'
      });

    expect(updated.status).to.equal(200);
    expect(updated.body.name).to.equal('Create Me Updated');
    expect(updated.body.startDate).to.equal('2026-09-12');
  });
});
