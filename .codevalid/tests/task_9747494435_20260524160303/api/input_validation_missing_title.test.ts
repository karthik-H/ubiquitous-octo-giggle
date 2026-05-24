import request from 'supertest';
import { expect } from 'chai';

describe('input_validation_missing_title', () => {
  let app: any;
  let resetState: any;
  let mockUuid: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Set up the mock BEFORE importing the app
    jest.doMock('uuid', () => ({
      v4: jest.fn()
        .mockReturnValueOnce('event-validation-id')
        .mockReturnValueOnce('task-validation-id')
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

  it('POST /api/tasks returns 400 when title is missing', async () => {
    await request(app).post('/api/events').send({
      name: 'Validation Event',
      description: 'Validation setup',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    const response = await request(app)
      .post('/api/tasks')
      .send({
        description: 'Review',
        status: 'To Do',
        eventId: 'event-validation-id',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: 'Title, status, and eventId are required',
    });

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });

  it('POST /api/tasks returns 400 when status is missing', async () => {
    await request(app).post('/api/events').send({
      name: 'Validation Event',
      description: 'Validation setup',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Missing status',
        description: 'No status provided',
        eventId: 'event-validation-id',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: 'Title, status, and eventId are required',
    });
  });

  it('POST /api/tasks returns 400 when eventId is missing', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Missing event',
        description: 'No event id provided',
        status: 'To Do',
      });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: 'Title, status, and eventId are required',
    });
    expect(mockUuid.mock.calls).to.have.lengthOf(0);
  });

  it('PUT /api/tasks/:id returns 404 when updating a task that does not exist', async () => {
    const response = await request(app)
      .put('/api/tasks/missing-task-id')
      .send({
        title: 'Updated title',
        description: 'Updated description',
        status: 'Completed',
      });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Task not found' });
  });
});
