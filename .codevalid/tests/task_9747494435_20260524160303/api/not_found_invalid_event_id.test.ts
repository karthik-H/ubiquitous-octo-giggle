jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import request from 'supertest';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

const mockUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('not_found_invalid_event_id', () => {
  let app: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    mockUuid.mockReset();
    mockUuid
      .mockReturnValueOnce('existing-event-id')
      .mockReturnValueOnce('created-task-id')
      .mockReturnValueOnce('replacement-event-id')
      .mockReturnValue('fallback-id');

    ({ app } = await import('../../../../server/src/index'));
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
    expect(mockUuid).to.have.callCount(0);
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
