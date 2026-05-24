import request from 'supertest';
import { expect } from 'chai';

const loadFreshApp = async () => {
  jest.resetModules();
  const mod = await import('../../../../server/src/index');
  return mod.app;
};

describe('malformed_json_request_body', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('PUT /api/tasks/:id with malformed JSON returns 400 before the handler completes', async () => {
    const app = await loadFreshApp();

    const response = await request(app)
      .put('/api/tasks/t1')
      .set('Content-Type', 'application/json')
      .send('{title:"test"}');

    expect(response.status).to.equal(400);
    expect(response.text).to.contain('SyntaxError');
  });

  it('POST /api/tasks with malformed JSON also returns 400 from body parsing middleware', async () => {
    const app = await loadFreshApp();

    const response = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title":}');

    expect(response.status).to.equal(400);
    expect(response.text).to.contain('SyntaxError');
  });

  it('POST /api/events with valid JSON still works in the same app instance', async () => {
    const app = await loadFreshApp();

    const response = await request(app).post('/api/events').send({
      name: 'Valid Event',
      description: 'Created after malformed request coverage',
      startDate: '2026-05-01',
      endDate: '2026-05-02',
    });

    expect(response.status).to.equal(201);
    expect(response.body.name).to.equal('Valid Event');
    expect(response.body.id).to.be.a('string');
  });

  it('GET /api/tasks returns an empty array in a fresh app with no seeded tasks', async () => {
    const app = await loadFreshApp();

    const response = await request(app).get('/api/tasks');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([]);
  });
});
