import request from 'supertest';
import { expect } from 'chai';
import express from 'express';
import type { Server } from 'http';

describe('delete_non_existent_event', () => {
  let server: Server;

  const loadServer = async (): Promise<Server> => {
    jest.resetModules();

    let capturedServer: Server | undefined;
    const listenSpy = jest
      .spyOn(express.application as any, 'listen')
      .mockImplementation(function mockListen(this: any, ...args: any[]) {
        const app = this as express.Express;
        const createdServer = require('http').createServer(app);
        capturedServer = createdServer;

        const maybeCallback = args.find((arg: unknown) => typeof arg === 'function');
        if (maybeCallback) {
          maybeCallback();
        }

        return createdServer;
      });

    await import('../../../../server/src/index');

    listenSpy.mockRestore();

    if (!capturedServer) {
      throw new Error('Failed to capture Express server instance');
    }

    return capturedServer;
  };

  beforeEach(async () => {
    server = await loadServer();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (server && server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err?: Error) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  });

  it('returns 204 and leaves existing events and tasks unchanged when deleting a non-existent event', async () => {
    const existingEvent = await request(server).post('/api/events').send({
      name: 'evt-2 real event',
      description: 'persist after noop delete',
      startDate: '2026-06-01',
      endDate: '2026-06-02'
    });

    expect(existingEvent.status).to.equal(201);

    const existingTask = await request(server).post('/api/tasks').send({
      title: 'Task for evt-2',
      description: 'should survive',
      status: 'To Do',
      eventId: existingEvent.body.id
    });

    expect(existingTask.status).to.equal(201);

    const deleteResponse = await request(server).delete('/api/events/evt-999');
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const listEvents = await request(server).get('/api/events');
    expect(listEvents.status).to.equal(200);
    expect(listEvents.body).to.have.length(1);
    expect(listEvents.body[0].id).to.equal(existingEvent.body.id);

    const getExistingEvent = await request(server).get(`/api/events/${existingEvent.body.id}`);
    expect(getExistingEvent.status).to.equal(200);
    expect(getExistingEvent.body.id).to.equal(existingEvent.body.id);

    const listTasks = await request(server).get('/api/tasks');
    expect(listTasks.status).to.equal(200);
    expect(listTasks.body).to.have.length(1);
    expect(listTasks.body[0].eventId).to.equal(existingEvent.body.id);

    const filteredTasks = await request(server).get(`/api/tasks?event_id=${existingEvent.body.id}`);
    expect(filteredTasks.status).to.equal(200);
    expect(filteredTasks.body).to.have.length(1);
    expect(filteredTasks.body[0].id).to.equal(existingTask.body.id);
  });

  it('supports idempotent repeated deletion of an already deleted event', async () => {
    const createEvent = await request(server).post('/api/events').send({
      name: 'repeat delete event',
      description: 'delete twice',
      startDate: '2026-07-10',
      endDate: '2026-07-11'
    });
    expect(createEvent.status).to.equal(201);

    const createTask = await request(server).post('/api/tasks').send({
      title: 'Delete me too',
      description: 'linked task',
      status: 'In Progress',
      eventId: createEvent.body.id
    });
    expect(createTask.status).to.equal(201);

    const firstDelete = await request(server).delete(`/api/events/${createEvent.body.id}`);
    expect(firstDelete.status).to.equal(204);

    const secondDelete = await request(server).delete(`/api/events/${createEvent.body.id}`);
    expect(secondDelete.status).to.equal(204);

    const getDeletedEvent = await request(server).get(`/api/events/${createEvent.body.id}`);
    expect(getDeletedEvent.status).to.equal(404);

    const listTasks = await request(server).get('/api/tasks');
    expect(listTasks.status).to.equal(200);
    expect(listTasks.body).to.deep.equal([]);
  });

  it('covers event update success and missing-event failure branches', async () => {
    const createEvent = await request(server).post('/api/events').send({
      name: 'Changeable Event',
      description: 'before update',
      startDate: '2026-08-01',
      endDate: '2026-08-02'
    });

    expect(createEvent.status).to.equal(201);

    const updateEvent = await request(server).put(`/api/events/${createEvent.body.id}`).send({
      name: 'Changed Event',
      description: 'after update',
      startDate: '2026-08-03',
      endDate: '2026-08-04'
    });

    expect(updateEvent.status).to.equal(200);
    expect(updateEvent.body.id).to.equal(createEvent.body.id);
    expect(updateEvent.body.name).to.equal('Changed Event');
    expect(updateEvent.body.description).to.equal('after update');

    const missingUpdate = await request(server).put('/api/events/not-found').send({
      name: 'Missing',
      description: 'missing',
      startDate: '2026-08-05',
      endDate: '2026-08-06'
    });

    expect(missingUpdate.status).to.equal(404);
    expect(missingUpdate.body.error).to.equal('Event not found');
  });

  it('covers event creation validation and get-by-id not-found branch', async () => {
    const invalidCreate = await request(server).post('/api/events').send({
      name: 'Incomplete Event',
      description: 'missing dates'
    });

    expect(invalidCreate.status).to.equal(400);
    expect(invalidCreate.body.error).to.equal('Name, startDate, and endDate are required');

    const missingGet = await request(server).get('/api/events/does-not-exist');
    expect(missingGet.status).to.equal(404);
    expect(missingGet.body.error).to.equal('Event not found');
  });

  it('covers task creation, invalid event association, deletion, and missing task update', async () => {
    const event = await request(server).post('/api/events').send({
      name: 'Task Host Event',
      description: 'for task routes',
      startDate: '2026-09-01',
      endDate: '2026-09-02'
    });
    expect(event.status).to.equal(201);

    const invalidTask = await request(server).post('/api/tasks').send({
      title: 'Broken link',
      description: 'bad event',
      status: 'To Do',
      eventId: 'missing-event'
    });
    expect(invalidTask.status).to.equal(400);
    expect(invalidTask.body.error).to.equal('Associated event not found');

    const createdTask = await request(server).post('/api/tasks').send({
      title: 'Valid task',
      description: 'good event',
      status: 'Completed',
      eventId: event.body.id
    });
    expect(createdTask.status).to.equal(201);

    const deleteTask = await request(server).delete(`/api/tasks/${createdTask.body.id}`);
    expect(deleteTask.status).to.equal(204);

    const remainingTasks = await request(server).get('/api/tasks');
    expect(remainingTasks.status).to.equal(200);
    expect(remainingTasks.body).to.deep.equal([]);

    const missingTaskUpdate = await request(server).put('/api/tasks/missing').send({
      title: 'No task',
      description: 'still no task',
      status: 'To Do',
      eventId: event.body.id
    });
    expect(missingTaskUpdate.status).to.equal(404);
    expect(missingTaskUpdate.body.error).to.equal('Task not found');
  });
});
