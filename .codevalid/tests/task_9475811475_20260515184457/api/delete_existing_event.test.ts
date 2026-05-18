import request from 'supertest';
import { expect } from 'chai';

let capturedApp: any;

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  const wrapped = () => {
    const app = actual.default();
    const originalListen = app.listen.bind(app);
    app.listen = jest.fn((...args: any[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        callback();
      }
      return {
        close: jest.fn()
      };
    });
    (app as any).__originalListen = originalListen;
    capturedApp = app;
    return app;
  };

  return {
    __esModule: true,
    default: wrapped,
    ...actual
  };
});

describe('delete_existing_event', () => {
  const loadFreshApp = async () => {
    jest.resetModules();
    capturedApp = undefined;
    await import('../../../server/src/index');
    return capturedApp;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('Delete existing event and associated tasks returns 204 and removes linked records', async () => {
    const app = await loadFreshApp();

    const createEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Expo Launch',
        description: 'Main event',
        startDate: '2026-05-01',
        endDate: '2026-05-02'
      });

    expect(createEvent.status).to.equal(201);
    const eventId = createEvent.body.id;

    const createTask = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Prepare booth',
        description: 'Set up materials',
        status: 'To Do',
        eventId
      });

    expect(createTask.status).to.equal(201);
    expect(createTask.body.eventId).to.equal(eventId);

    const deleteRes = await request(app).delete(`/api/events/${eventId}`);
    expect(deleteRes.status).to.equal(204);
    expect(deleteRes.text).to.equal('');

    const eventsAfterDelete = await request(app).get('/api/events');
    expect(eventsAfterDelete.status).to.equal(200);
    expect(eventsAfterDelete.body).to.deep.equal([]);

    const tasksAfterDelete = await request(app).get('/api/tasks');
    expect(tasksAfterDelete.status).to.equal(200);
    expect(tasksAfterDelete.body).to.deep.equal([]);
  });

  it('covers event CRUD endpoints including validation and not-found branches', async () => {
    const app = await loadFreshApp();

    const emptyList = await request(app).get('/api/events');
    expect(emptyList.status).to.equal(200);
    expect(emptyList.body).to.deep.equal([]);

    const missingFields = await request(app)
      .post('/api/events')
      .send({ description: 'Missing required fields' });
    expect(missingFields.status).to.equal(400);
    expect(missingFields.body.error).to.equal('Name, startDate, and endDate are required');

    const created = await request(app)
      .post('/api/events')
      .send({
        name: 'Alpha Summit',
        description: 'Original description',
        startDate: '2026-06-10',
        endDate: '2026-06-11'
      });
    expect(created.status).to.equal(201);
    expect(created.body.id).to.be.a('string');
    expect(created.body.name).to.equal('Alpha Summit');

    const fetched = await request(app).get(`/api/events/${created.body.id}`);
    expect(fetched.status).to.equal(200);
    expect(fetched.body.id).to.equal(created.body.id);
    expect(fetched.body.description).to.equal('Original description');

    const notFoundGet = await request(app).get('/api/events/missing-event');
    expect(notFoundGet.status).to.equal(404);
    expect(notFoundGet.body.error).to.equal('Event not found');

    const updated = await request(app)
      .put(`/api/events/${created.body.id}`)
      .send({
        name: 'Alpha Summit Updated',
        description: 'Updated description',
        startDate: '2026-06-12',
        endDate: '2026-06-13'
      });
    expect(updated.status).to.equal(200);
    expect(updated.body.name).to.equal('Alpha Summit Updated');
    expect(updated.body.description).to.equal('Updated description');
    expect(updated.body.startDate).to.equal('2026-06-12');
    expect(updated.body.endDate).to.equal('2026-06-13');

    const updateMissing = await request(app)
      .put('/api/events/missing-event')
      .send({ name: 'Ghost', description: 'Ghost', startDate: '2026-01-01', endDate: '2026-01-02' });
    expect(updateMissing.status).to.equal(404);
    expect(updateMissing.body.error).to.equal('Event not found');
  });

  it('covers task CRUD, event filtering, and task validation around event deletion', async () => {
    const app = await loadFreshApp();

    const firstEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Beta Event',
        description: 'Event beta',
        startDate: '2026-07-01',
        endDate: '2026-07-02'
      });
    const secondEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Gamma Event',
        description: 'Event gamma',
        startDate: '2026-08-01',
        endDate: '2026-08-02'
      });

    const missingTaskFields = await request(app)
      .post('/api/tasks')
      .send({ title: 'Incomplete task' });
    expect(missingTaskFields.status).to.equal(400);
    expect(missingTaskFields.body.error).to.equal('Title, status, and eventId are required');

    const missingEventTask = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Broken relation',
        description: 'No event exists',
        status: 'To Do',
        eventId: 'missing-event'
      });
    expect(missingEventTask.status).to.equal(400);
    expect(missingEventTask.body.error).to.equal('Associated event not found');

    const taskOne = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Task one',
        description: 'Belongs to first event',
        status: 'To Do',
        eventId: firstEvent.body.id
      });
    const taskTwo = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Task two',
        description: 'Belongs to second event',
        status: 'In Progress',
        eventId: secondEvent.body.id
      });

    expect(taskOne.status).to.equal(201);
    expect(taskTwo.status).to.equal(201);

    const allTasks = await request(app).get('/api/tasks');
    expect(allTasks.status).to.equal(200);
    expect(allTasks.body).to.have.length(2);

    const filteredTasks = await request(app).get(`/api/tasks?event_id=${firstEvent.body.id}`);
    expect(filteredTasks.status).to.equal(200);
    expect(filteredTasks.body).to.have.length(1);
    expect(filteredTasks.body[0].eventId).to.equal(firstEvent.body.id);

    const badTaskUpdate = await request(app)
      .put(`/api/tasks/${taskOne.body.id}`)
      .send({
        title: 'Task one moved',
        description: 'Attempt invalid move',
        status: 'Completed',
        eventId: 'missing-event'
      });
    expect(badTaskUpdate.status).to.equal(400);
    expect(badTaskUpdate.body.error).to.equal('Associated event not found');

    const goodTaskUpdate = await request(app)
      .put(`/api/tasks/${taskOne.body.id}`)
      .send({
        title: 'Task one moved',
        description: 'Move to second event',
        status: 'Completed',
        eventId: secondEvent.body.id
      });
    expect(goodTaskUpdate.status).to.equal(200);
    expect(goodTaskUpdate.body.title).to.equal('Task one moved');
    expect(goodTaskUpdate.body.eventId).to.equal(secondEvent.body.id);
    expect(goodTaskUpdate.body.status).to.equal('Completed');

    const missingTaskUpdate = await request(app)
      .put('/api/tasks/missing-task')
      .send({
        title: 'Ghost task',
        description: 'No-op',
        status: 'To Do',
        eventId: secondEvent.body.id
      });
    expect(missingTaskUpdate.status).to.equal(404);
    expect(missingTaskUpdate.body.error).to.equal('Task not found');

    const deleteTask = await request(app).delete(`/api/tasks/${taskTwo.body.id}`);
    expect(deleteTask.status).to.equal(204);

    const deleteEventCascade = await request(app).delete(`/api/events/${secondEvent.body.id}`);
    expect(deleteEventCascade.status).to.equal(204);

    const remainingTasks = await request(app).get('/api/tasks');
    expect(remainingTasks.status).to.equal(200);
    expect(remainingTasks.body).to.deep.equal([]);
  });
});
