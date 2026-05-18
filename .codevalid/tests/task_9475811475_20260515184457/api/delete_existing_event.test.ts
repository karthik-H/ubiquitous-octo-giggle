import request from 'supertest';
import { expect } from 'chai';
import express from 'express';
import type { Server } from 'http';

describe('delete_existing_event', () => {
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

  it('deletes an existing event and removes its associated tasks', async () => {
    const createEvent = await request(server).post('/api/events').send({
      name: 'evt kickoff',
      description: 'initial planning',
      startDate: '2026-01-10',
      endDate: '2026-01-11'
    });

    expect(createEvent.status).to.equal(201);
    expect(createEvent.body.name).to.equal('evt kickoff');
    const eventId = createEvent.body.id as string;

    const createAssociatedTask = await request(server).post('/api/tasks').send({
      title: 'Prepare venue',
      description: 'book the room',
      status: 'To Do',
      eventId
    });

    expect(createAssociatedTask.status).to.equal(201);
    expect(createAssociatedTask.body.eventId).to.equal(eventId);

    const createOtherEvent = await request(server).post('/api/events').send({
      name: 'other event',
      description: 'separate event',
      startDate: '2026-02-01',
      endDate: '2026-02-02'
    });
    expect(createOtherEvent.status).to.equal(201);

    const createOtherTask = await request(server).post('/api/tasks').send({
      title: 'Unrelated task',
      description: 'should remain',
      status: 'In Progress',
      eventId: createOtherEvent.body.id
    });
    expect(createOtherTask.status).to.equal(201);

    const deleteResponse = await request(server).delete(`/api/events/${eventId}`);
    expect(deleteResponse.status).to.equal(204);
    expect(deleteResponse.text).to.equal('');

    const listEvents = await request(server).get('/api/events');
    expect(listEvents.status).to.equal(200);
    expect(listEvents.body.some((event: { id: string }) => event.id === eventId)).to.equal(false);
    expect(listEvents.body.some((event: { id: string }) => event.id === createOtherEvent.body.id)).to.equal(true);

    const getDeletedEvent = await request(server).get(`/api/events/${eventId}`);
    expect(getDeletedEvent.status).to.equal(404);
    expect(getDeletedEvent.body.error).to.equal('Event not found');

    const listAllTasks = await request(server).get('/api/tasks');
    expect(listAllTasks.status).to.equal(200);
    expect(listAllTasks.body.some((task: { eventId: string }) => task.eventId === eventId)).to.equal(false);
    expect(listAllTasks.body.some((task: { eventId: string }) => task.eventId === createOtherEvent.body.id)).to.equal(true);

    const filteredTasksForDeletedEvent = await request(server).get(`/api/tasks?event_id=${eventId}`);
    expect(filteredTasksForDeletedEvent.status).to.equal(200);
    expect(filteredTasksForDeletedEvent.body).to.deep.equal([]);
  });

  it('creates, lists, gets, and updates events through the public routes', async () => {
    const initialList = await request(server).get('/api/events');
    expect(initialList.status).to.equal(200);
    expect(initialList.body).to.deep.equal([]);

    const createEvent = await request(server).post('/api/events').send({
      name: 'Launch Day',
      description: 'public release',
      startDate: '2026-03-01',
      endDate: '2026-03-02'
    });

    expect(createEvent.status).to.equal(201);
    expect(createEvent.body.id).to.be.a('string');
    expect(createEvent.body.name).to.equal('Launch Day');
    expect(createEvent.body.description).to.equal('public release');
    expect(createEvent.body.startDate).to.equal('2026-03-01');
    expect(createEvent.body.endDate).to.equal('2026-03-02');

    const eventId = createEvent.body.id as string;

    const getEvent = await request(server).get(`/api/events/${eventId}`);
    expect(getEvent.status).to.equal(200);
    expect(getEvent.body.id).to.equal(eventId);
    expect(getEvent.body.name).to.equal('Launch Day');

    const updateEvent = await request(server).put(`/api/events/${eventId}`).send({
      name: 'Launch Week',
      description: 'expanded release window',
      startDate: '2026-03-01',
      endDate: '2026-03-07'
    });

    expect(updateEvent.status).to.equal(200);
    expect(updateEvent.body.id).to.equal(eventId);
    expect(updateEvent.body.name).to.equal('Launch Week');
    expect(updateEvent.body.description).to.equal('expanded release window');
    expect(updateEvent.body.endDate).to.equal('2026-03-07');

    const listEvents = await request(server).get('/api/events');
    expect(listEvents.status).to.equal(200);
    expect(listEvents.body).to.have.length(1);
    expect(listEvents.body[0].id).to.equal(eventId);
    expect(listEvents.body[0].name).to.equal('Launch Week');
  });

  it('returns validation errors for invalid event and task creation payloads', async () => {
    const missingEventFields = await request(server).post('/api/events').send({
      description: 'missing required fields'
    });

    expect(missingEventFields.status).to.equal(400);
    expect(missingEventFields.body.error).to.equal('Name, startDate, and endDate are required');

    const missingTaskFields = await request(server).post('/api/tasks').send({
      description: 'missing title status and eventId'
    });

    expect(missingTaskFields.status).to.equal(400);
    expect(missingTaskFields.body.error).to.equal('Title, status, and eventId are required');

    const missingAssociatedEvent = await request(server).post('/api/tasks').send({
      title: 'Ghost task',
      description: 'invalid event link',
      status: 'To Do',
      eventId: 'evt-999'
    });

    expect(missingAssociatedEvent.status).to.equal(400);
    expect(missingAssociatedEvent.body.error).to.equal('Associated event not found');
  });

  it('covers task listing filters and task update branches including invalid reassignment', async () => {
    const firstEvent = await request(server).post('/api/events').send({
      name: 'Alpha Event',
      description: 'alpha',
      startDate: '2026-04-01',
      endDate: '2026-04-02'
    });
    const secondEvent = await request(server).post('/api/events').send({
      name: 'Beta Event',
      description: 'beta',
      startDate: '2026-04-03',
      endDate: '2026-04-04'
    });

    expect(firstEvent.status).to.equal(201);
    expect(secondEvent.status).to.equal(201);

    const firstTask = await request(server).post('/api/tasks').send({
      title: 'Alpha task',
      description: 'for alpha',
      status: 'To Do',
      eventId: firstEvent.body.id
    });
    expect(firstTask.status).to.equal(201);

    const secondTask = await request(server).post('/api/tasks').send({
      title: 'Beta task',
      description: 'for beta',
      status: 'Completed',
      eventId: secondEvent.body.id
    });
    expect(secondTask.status).to.equal(201);

    const filteredAlphaTasks = await request(server).get(`/api/tasks?event_id=${firstEvent.body.id}`);
    expect(filteredAlphaTasks.status).to.equal(200);
    expect(filteredAlphaTasks.body).to.have.length(1);
    expect(filteredAlphaTasks.body[0].title).to.equal('Alpha task');

    const updateTask = await request(server).put(`/api/tasks/${firstTask.body.id}`).send({
      title: 'Alpha task updated',
      description: 'moved to beta',
      status: 'In Progress',
      eventId: secondEvent.body.id
    });

    expect(updateTask.status).to.equal(200);
    expect(updateTask.body.title).to.equal('Alpha task updated');
    expect(updateTask.body.status).to.equal('In Progress');
    expect(updateTask.body.eventId).to.equal(secondEvent.body.id);

    const invalidReassignment = await request(server).put(`/api/tasks/${secondTask.body.id}`).send({
      title: 'Beta task invalid',
      description: 'bad reassignment',
      status: 'Completed',
      eventId: 'missing-event'
    });

    expect(invalidReassignment.status).to.equal(400);
    expect(invalidReassignment.body.error).to.equal('Associated event not found');

    const missingTask = await request(server).put('/api/tasks/missing-task').send({
      title: 'none',
      description: 'none',
      status: 'To Do',
      eventId: secondEvent.body.id
    });

    expect(missingTask.status).to.equal(404);
    expect(missingTask.body.error).to.equal('Task not found');
  });

  it('returns not found for missing event reads and updates', async () => {
    const getMissingEvent = await request(server).get('/api/events/missing-event');
    expect(getMissingEvent.status).to.equal(404);
    expect(getMissingEvent.body.error).to.equal('Event not found');

    const updateMissingEvent = await request(server).put('/api/events/missing-event').send({
      name: 'No Event',
      description: 'still missing',
      startDate: '2026-05-01',
      endDate: '2026-05-02'
    });

    expect(updateMissingEvent.status).to.equal(404);
    expect(updateMissingEvent.body.error).to.equal('Event not found');
  });
});
