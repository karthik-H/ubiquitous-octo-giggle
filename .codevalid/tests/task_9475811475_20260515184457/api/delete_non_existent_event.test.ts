import request from 'supertest';
import { expect } from 'chai';

let capturedApp: any;

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  const wrapped = () => {
    const app = actual.default();
    app.listen = jest.fn((...args: any[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === 'function') {
        callback();
      }
      return {
        close: jest.fn()
      };
    });
    capturedApp = app;
    return app;
  };

  return {
    __esModule: true,
    default: wrapped,
    ...actual
  };
});

describe('delete_non_existent_event', () => {
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

  it('Delete non-existent event returns 204 silently and keeps existing records intact', async () => {
    const app = await loadFreshApp();

    const createEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Event Two',
        description: 'Still present',
        startDate: '2026-09-10',
        endDate: '2026-09-11'
      });
    expect(createEvent.status).to.equal(201);

    const createTask = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Existing task',
        description: 'Should remain',
        status: 'To Do',
        eventId: createEvent.body.id
      });
    expect(createTask.status).to.equal(201);

    const deleteRes = await request(app).delete('/api/events/evt-999');
    expect(deleteRes.status).to.equal(204);
    expect(deleteRes.text).to.equal('');

    const eventsAfter = await request(app).get('/api/events');
    expect(eventsAfter.status).to.equal(200);
    expect(eventsAfter.body).to.have.length(1);
    expect(eventsAfter.body[0].id).to.equal(createEvent.body.id);

    const tasksAfter = await request(app).get('/api/tasks');
    expect(tasksAfter.status).to.equal(200);
    expect(tasksAfter.body).to.have.length(1);
    expect(tasksAfter.body[0].eventId).to.equal(createEvent.body.id);
  });

  it('covers idempotent delete behavior for events and tasks across repeated requests', async () => {
    const app = await loadFreshApp();

    const createdEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Repeatable Delete Event',
        description: 'Used for idempotency',
        startDate: '2026-10-01',
        endDate: '2026-10-02'
      });
    expect(createdEvent.status).to.equal(201);

    const createdTask = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Delete me later',
        description: 'Task cleanup check',
        status: 'In Progress',
        eventId: createdEvent.body.id
      });
    expect(createdTask.status).to.equal(201);

    const firstDelete = await request(app).delete(`/api/events/${createdEvent.body.id}`);
    expect(firstDelete.status).to.equal(204);

    const secondDelete = await request(app).delete(`/api/events/${createdEvent.body.id}`);
    expect(secondDelete.status).to.equal(204);

    const tasksAfterCascade = await request(app).get('/api/tasks');
    expect(tasksAfterCascade.status).to.equal(200);
    expect(tasksAfterCascade.body).to.deep.equal([]);

    const taskDeleteMissing = await request(app).delete(`/api/tasks/${createdTask.body.id}`);
    expect(taskDeleteMissing.status).to.equal(204);

    const eventLookup = await request(app).get(`/api/events/${createdEvent.body.id}`);
    expect(eventLookup.status).to.equal(404);
    expect(eventLookup.body.error).to.equal('Event not found');
  });

  it('covers create, read, update, filter, and validation branches while preserving unrelated records', async () => {
    const app = await loadFreshApp();

    const firstEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Delta Day',
        description: 'First event',
        startDate: '2026-11-01',
        endDate: '2026-11-01'
      });
    const secondEvent = await request(app)
      .post('/api/events')
      .send({
        name: 'Echo Expo',
        description: 'Second event',
        startDate: '2026-11-05',
        endDate: '2026-11-06'
      });

    expect(firstEvent.status).to.equal(201);
    expect(secondEvent.status).to.equal(201);

    const taskOne = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Delta setup',
        description: 'Prepare venue',
        status: 'To Do',
        eventId: firstEvent.body.id
      });
    const taskTwo = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Echo cleanup',
        description: 'Finish teardown',
        status: 'Completed',
        eventId: secondEvent.body.id
      });

    expect(taskOne.status).to.equal(201);
    expect(taskTwo.status).to.equal(201);

    const listEvents = await request(app).get('/api/events');
    expect(listEvents.status).to.equal(200);
    expect(listEvents.body).to.have.length(2);

    const filterSecondTasks = await request(app).get(`/api/tasks?event_id=${secondEvent.body.id}`);
    expect(filterSecondTasks.status).to.equal(200);
    expect(filterSecondTasks.body).to.have.length(1);
    expect(filterSecondTasks.body[0].title).to.equal('Echo cleanup');

    const updateSecondEvent = await request(app)
      .put(`/api/events/${secondEvent.body.id}`)
      .send({
        name: 'Echo Expo Updated',
        description: 'Updated event details',
        startDate: '2026-11-07',
        endDate: '2026-11-08'
      });
    expect(updateSecondEvent.status).to.equal(200);
    expect(updateSecondEvent.body.name).to.equal('Echo Expo Updated');

    const updateTaskWithoutChangingEvent = await request(app)
      .put(`/api/tasks/${taskOne.body.id}`)
      .send({
        title: 'Delta setup revised',
        description: 'Prepare venue and signage',
        status: 'In Progress'
      });
    expect(updateTaskWithoutChangingEvent.status).to.equal(200);
    expect(updateTaskWithoutChangingEvent.body.title).to.equal('Delta setup revised');
    expect(updateTaskWithoutChangingEvent.body.eventId).to.equal(firstEvent.body.id);

    const createTaskMissingEvent = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Missing relation',
        status: 'To Do'
      });
    expect(createTaskMissingEvent.status).to.equal(400);
    expect(createTaskMissingEvent.body.error).to.equal('Title, status, and eventId are required');

    const createEventMissingName = await request(app)
      .post('/api/events')
      .send({
        description: 'No name',
        startDate: '2026-12-01',
        endDate: '2026-12-02'
      });
    expect(createEventMissingName.status).to.equal(400);
    expect(createEventMissingName.body.error).to.equal('Name, startDate, and endDate are required');

    const missingTaskUpdate = await request(app)
      .put('/api/tasks/not-real')
      .send({
        title: 'No task',
        description: 'Nothing to update',
        status: 'To Do',
        eventId: firstEvent.body.id
      });
    expect(missingTaskUpdate.status).to.equal(404);
    expect(missingTaskUpdate.body.error).to.equal('Task not found');

    const missingEventUpdate = await request(app)
      .put('/api/events/not-real')
      .send({
        name: 'No event',
        description: 'Nothing to update',
        startDate: '2026-12-03',
        endDate: '2026-12-04'
      });
    expect(missingEventUpdate.status).to.equal(404);
    expect(missingEventUpdate.body.error).to.equal('Event not found');

    const deleteUnrelatedMissingEvent = await request(app).delete('/api/events/not-real');
    expect(deleteUnrelatedMissingEvent.status).to.equal(204);

    const preservedEvents = await request(app).get('/api/events');
    expect(preservedEvents.status).to.equal(200);
    expect(preservedEvents.body).to.have.length(2);

    const preservedTasks = await request(app).get('/api/tasks');
    expect(preservedTasks.status).to.equal(200);
    expect(preservedTasks.body).to.have.length(2);
  });
});
