jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import request from 'supertest';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

const mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('happy_path_valid_task_creation', () => {
  let app: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockUuid.mockReset();
    mockUuid
      .mockReturnValueOnce('event-seed-id')
      .mockReturnValueOnce('task-created-id')
      .mockReturnValueOnce('task-update-id')
      .mockReturnValue('fallback-id');

    ({ app } = await import('../../../../server/src/index'));
  });

  it('POST /api/tasks creates a task when the associated event exists', async () => {
    const createEventResponse = await request(app)
      .post('/api/events')
      .send({
        name: 'Sprint Planning',
        description: 'Planning meeting',
        startDate: '2026-05-24',
        endDate: '2026-05-25',
      });

    expect(createEventResponse.status).to.equal(201);
    expect(createEventResponse.body.id).to.equal('event-seed-id');

    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Design review',
        description: 'Review wireframes',
        status: 'To Do',
        eventId: 'event-seed-id',
      });

    expect(response.status).to.equal(201);
    expect(response.body).to.deep.equal({
      id: 'task-created-id',
      title: 'Design review',
      description: 'Review wireframes',
      status: 'To Do',
      eventId: 'event-seed-id',
    });
    expect(mockUuid).to.have.callCount(2);
  });

  it('GET /api/tasks lists the newly created task and supports event_id filtering', async () => {
    await request(app).post('/api/events').send({
      name: 'Sprint Planning',
      description: 'Planning meeting',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Design review',
      description: 'Review wireframes',
      status: 'To Do',
      eventId: 'event-seed-id',
    });

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([
      {
        id: 'task-created-id',
        title: 'Design review',
        description: 'Review wireframes',
        status: 'To Do',
        eventId: 'event-seed-id',
      },
    ]);

    const filteredResponse = await request(app).get('/api/tasks').query({ event_id: 'event-seed-id' });
    expect(filteredResponse.status).to.equal(200);
    expect(filteredResponse.body).to.deep.equal(listResponse.body);
  });

  it('PUT /api/tasks/:id updates task fields when the task exists', async () => {
    await request(app).post('/api/events').send({
      name: 'Sprint Planning',
      description: 'Planning meeting',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Design review',
      description: 'Review wireframes',
      status: 'To Do',
      eventId: 'event-seed-id',
    });

    const updateResponse = await request(app)
      .put('/api/tasks/task-created-id')
      .send({
        title: 'Updated design review',
        description: 'Review final wireframes',
        status: 'In Progress',
        eventId: 'event-seed-id',
      });

    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body).to.deep.equal({
      id: 'task-created-id',
      title: 'Updated design review',
      description: 'Review final wireframes',
      status: 'In Progress',
      eventId: 'event-seed-id',
    });

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.body).to.deep.equal([updateResponse.body]);
  });

  it('DELETE /api/tasks/:id removes the task from subsequent list results', async () => {
    await request(app).post('/api/events').send({
      name: 'Sprint Planning',
      description: 'Planning meeting',
      startDate: '2026-05-24',
      endDate: '2026-05-25',
    });

    await request(app).post('/api/tasks').send({
      title: 'Design review',
      description: 'Review wireframes',
      status: 'To Do',
      eventId: 'event-seed-id',
    });

    const deleteResponse = await request(app).delete('/api/tasks/task-created-id');
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const listResponse = await request(app).get('/api/tasks');
    expect(listResponse.status).to.equal(200);
    expect(listResponse.body).to.deep.equal([]);
  });
});
