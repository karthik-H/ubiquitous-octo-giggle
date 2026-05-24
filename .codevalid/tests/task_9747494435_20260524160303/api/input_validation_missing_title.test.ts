jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import request from 'supertest';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

const mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('input_validation_missing_title', () => {
  let app: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockUuid.mockReset();
    mockUuid
      .mockReturnValueOnce('event-validation-id')
      .mockReturnValueOnce('task-validation-id')
      .mockReturnValue('fallback-id');

    ({ app } = await import('../../../../server/src/index'));
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
    expect(mockUuid).to.have.callCount(0);
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
