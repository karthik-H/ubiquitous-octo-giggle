jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import request from 'supertest';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

const mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('response_serialization_correct_structure', () => {
  let app: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockUuid.mockReset();
    mockUuid
      .mockReturnValueOnce('serialized-event-id')
      .mockReturnValueOnce('serialized-task-id')
      .mockReturnValueOnce('second-event-id')
      .mockReturnValue('fallback-id');

    ({ app } = await import('../../../../server/src/index'));
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
