import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('missing_required_field_endDate', () => {
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

  it('returns 400 when endDate is missing', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .post('/api/events')
      .send({ name: 'No End', startDate: '2026-10-01' });

    expect(res.status).to.equal(400);
    expect(res.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
  });

  it('returns 400 when endDate is an empty string', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .post('/api/events')
      .send({ name: 'Blank End', startDate: '2026-10-01', endDate: '' });

    expect(res.status).to.equal(400);
  });

  it('returns 204 when deleting a non-existent event and keeps event list empty', async () => {
    const app = await loadFreshApp();

    const deleted = await request(app).delete('/api/events/non-existent');
    expect(deleted.status).to.equal(204);

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.deep.equal([]);
  });

  it('returns 404 when updating an unknown event id', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .put('/api/events/unknown-id')
      .send({
        name: 'Updated',
        description: 'none',
        startDate: '2026-10-05',
        endDate: '2026-10-06'
      });

    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal('Event not found');
  });
});
