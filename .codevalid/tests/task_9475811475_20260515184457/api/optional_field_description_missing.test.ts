import request from 'supertest';
import { expect } from 'chai';
import type { Express } from 'express';

describe('optional_field_description_missing', () => {
  const loadFreshApp = async (uuidValues: string[] = ['event-no-description', 'event-second']) => {
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

  it('creates an event when description is omitted', async () => {
    const app = await loadFreshApp();

    const res = await request(app)
      .post('/api/events')
      .send({
        name: 'No Description Event',
        startDate: '2026-11-01',
        endDate: '2026-11-02'
      });

    expect(res.status).to.equal(201);
    expect(res.body.id).to.equal('event-no-description');
    expect(res.body.name).to.equal('No Description Event');
    expect(res.body.startDate).to.equal('2026-11-01');
    expect(res.body.endDate).to.equal('2026-11-02');
    expect(Object.prototype.hasOwnProperty.call(res.body, 'description')).to.equal(false);
  });

  it('stores and returns multiple events including one without description', async () => {
    const app = await loadFreshApp(['event-no-description', 'event-with-description']);

    const first = await request(app)
      .post('/api/events')
      .send({ name: 'First Event', startDate: '2026-11-01', endDate: '2026-11-02' });
    expect(first.status).to.equal(201);

    const second = await request(app)
      .post('/api/events')
      .send({
        name: 'Second Event',
        description: 'Has text',
        startDate: '2026-11-03',
        endDate: '2026-11-04'
      });
    expect(second.status).to.equal(201);

    const listRes = await request(app).get('/api/events');
    expect(listRes.status).to.equal(200);
    expect(listRes.body).to.have.length(2);
    expect(listRes.body[0].id).to.equal('event-no-description');
    expect(listRes.body[1].description).to.equal('Has text');
  });

  it('updates an event and can overwrite description to undefined by omission', async () => {
    const app = await loadFreshApp(['event-update-desc']);

    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Event To Update',
        description: 'Original description',
        startDate: '2026-11-10',
        endDate: '2026-11-11'
      });

    const updated = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Event To Update',
        startDate: '2026-11-12',
        endDate: '2026-11-13'
      });

    expect(updated.status).to.equal(200);
    expect(updated.body.id).to.equal(created.body.id);
    expect(updated.body.startDate).to.equal('2026-11-12');
    expect(updated.body.endDate).to.equal('2026-11-13');
    expect(Object.prototype.hasOwnProperty.call(updated.body, 'description')).to.equal(false);
  });
});
