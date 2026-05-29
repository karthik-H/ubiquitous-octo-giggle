import request from 'supertest';
import { expect } from 'chai';

describe('not_found_invalid_event_id', () => {
  let app: any;
  let resetState: any;
  let mockUuid: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Set up the mock BEFORE importing the app
    jest.doMock('uuid', () => ({
      v4: jest.fn()
        .mockReturnValueOnce('existing-event-id')
        .mockReturnValueOnce('created-task-id')
        .mockReturnValueOnce('replacement-event-id')
        .mockReturnValue('fallback-id'),
    }));

    const appModule = await import('../../../../server/src/index');
    app = appModule.app;
    resetState = appModule.resetState;
    resetState();

    const { v4: uuidv4 } = await import('uuid');
    mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;
  });

  afterEach(() => {
    jest.unmock('uuid');
  });

  it('POST /api/tasks returns 400 when eventId does not reference an existing event', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Fix bug',
        description: '',
        status: 'Completed',
        eventId: 'evt-999',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
    expect(mockUuid.mock.calls).to.have.lengthOf(0);
  });

  it('PUT /api/tasks/:id returns 400 when changing to a non-existent event', async () => {
    await request(app).post('/api/events').send({
      name: 'Existing Event',
      description: 'Seed event',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Fix bug',
      description: 'Original',
      status: 'To Do',
      eventId: 'existing-event-id',
    });

    const response = await request(app)
      .put('/api/tasks/created-task-id')
      .send({
        title: 'Fix bug',
        description: 'Original',
        status: 'In Progress',
        eventId: 'evt-999',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.body).to.deep.equal([
      {
        id: 'created-task-id',
        title: 'Fix bug',
        description: 'Original',
        status: 'To Do',
        eventId: 'existing-event-id',
      },
    ]);
  });

  it('PUT /api/tasks/:id allows keeping the same eventId without revalidation failure', async () => {
    await request(app).post('/api/events').send({
      name: 'Existing Event',
      description: 'Seed event',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Fix bug',
      description: 'Original',
      status: 'To Do',
      eventId: 'existing-event-id',
    });

    const response = await request(app)
      .put('/api/tasks/created-task-id')
      .send({
        title: 'Fix bug quickly',
        description: 'Updated notes',
        status: 'Completed',
        eventId: 'existing-event-id',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: 'created-task-id',
      title: 'Fix bug quickly',
      description: 'Updated notes',
      status: 'Completed',
      eventId: 'existing-event-id',
    });
  });

  it('DELETE /api/tasks/:id still returns 204 even when the task id does not exist', async () => {
    const response = await request(app).delete('/api/tasks/non-existent-task-id');

    expect(response.status).to.equal(204);
    expect(response.text).to.equal('');

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
