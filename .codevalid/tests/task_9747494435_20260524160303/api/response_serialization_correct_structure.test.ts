import request from 'supertest';
import { expect } from 'chai';

describe('response_serialization_correct_structure', () => {
  let app: any;
  let resetState: any;
  let mockUuid: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Set up the mock BEFORE importing the app
    jest.doMock('uuid', () => ({
      v4: jest.fn()
        .mockReturnValueOnce('serialized-event-id')
        .mockReturnValueOnce('serialized-task-id')
        .mockReturnValueOnce('second-event-id')
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

  it('POST /api/tasks serializes the created task with id and supplied fields', async () => {
    await request(app).post('/api/events').send({
      name: 'Serialization Event',
      description: 'Seed event',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Test',
        description: '',
        status: 'To Do',
        eventId: 'serialized-event-id',
      });

    expect(response.status).to.equal(201);
    expect(response.body).to.have.property('id', 'serialized-task-id');
    expect(response.body).to.include({
      title: 'Test',
      description: '',
      status: 'To Do',
      eventId: 'serialized-event-id',
    });
    expect(Object.keys(response.body).sort()).to.deep.equal([
      'description',
      'eventId',
      'id',
      'status',
      'title',
    ]);
  });

  it('GET /api/tasks returns JSON arrays preserving created task structure', async () => {
    await request(app).post('/api/events').send({
      name: 'Serialization Event',
      description: 'Seed event',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Test',
      description: '',
      status: 'To Do',
      eventId: 'serialized-event-id',
    });

    const response = await request(app).get('/api/tasks');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([
      {
        id: 'serialized-task-id',
        title: 'Test',
        description: '',
        status: 'To Do',
        eventId: 'serialized-event-id',
      },
    ]);
  });

  it('PUT /api/tasks/:id preserves existing eventId when omitted from the update payload', async () => {
    await request(app).post('/api/events').send({
      name: 'Serialization Event',
      description: 'Seed event',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Test',
      description: '',
      status: 'To Do',
      eventId: 'serialized-event-id',
    });

    const response = await request(app)
      .put('/api/tasks/serialized-task-id')
      .send({
        title: 'Test updated',
        description: 'now with description',
        status: 'In Progress',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: 'serialized-task-id',
      title: 'Test updated',
      description: 'now with description',
      status: 'In Progress',
      eventId: 'serialized-event-id',
    });
  });

  it('PUT /api/tasks/:id can serialize a changed eventId when the replacement event exists', async () => {
    await request(app).post('/api/events').send({
      name: 'Serialization Event',
      description: 'Seed event',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Test',
      description: '',
      status: 'To Do',
      eventId: 'serialized-event-id',
    });

    await request(app).post('/api/events').send({
      name: 'Replacement Event',
      description: 'Another event',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
    });

    const response = await request(app)
      .put('/api/tasks/serialized-task-id')
      .send({
        title: 'Test moved',
        description: 'moved to another event',
        status: 'Completed',
        eventId: 'second-event-id',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({
      id: 'serialized-task-id',
      title: 'Test moved',
      description: 'moved to another event',
      status: 'Completed',
      eventId: 'second-event-id',
    });
  });
});
