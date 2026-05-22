import { expect } from 'chai';
import express from 'express';
import http, { AddressInfo } from 'http';

const SERVER_MODULE_PATH = '../../../server/src/index';

type TestServer = {
  server: http.Server;
  baseUrl: string;
  close: () => Promise<void>;
};

const loadApp = async (): Promise<express.Express> => {
  let appInstance: express.Express | undefined;
  const originalListen = express.application.listen;

  jest.isolateModules(() => {
    const listenSpy = jest
      .spyOn(express.application, 'listen')
      .mockImplementation(function mockListen(this: express.Application) {
        appInstance = this as unknown as express.Express;
        return {
          close: (cb?: () => void) => {
            if (cb) cb();
            return undefined;
          }
        } as never;
      });

    try {
      require(SERVER_MODULE_PATH);
    } finally {
      listenSpy.mockRestore();
      express.application.listen = originalListen;
    }
  });

  if (!appInstance) {
    throw new Error('Failed to capture Express app instance from server module');
  }

  return appInstance;
};

const createServer = async (): Promise<TestServer> => {
  jest.resetModules();
  const app = await loadApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      })
  };
};

const requestJson = async (
  baseUrl: string,
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: any }> => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  return { status: response.status, body };
};

describe('not_found_event_update', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createServer();
  });

  afterEach(async () => {
    await testServer.close();
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns 404 when updating a non-existent event id', async () => {
    const existing = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02'
      })
    });

    expect(existing.status).to.equal(201);

    const response = await requestJson(testServer.baseUrl, '/api/events/evt-999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Event'
      })
    });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('does not mutate existing events when update target is missing', async () => {
    const created = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Release',
        description: 'Launch prep',
        startDate: '2024-07-01',
        endDate: '2024-07-02'
      })
    });

    await requestJson(testServer.baseUrl, '/api/events/not-real-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Should Not Apply',
        description: 'No effect',
        startDate: '2025-01-01',
        endDate: '2025-01-02'
      })
    });

    const fetched = await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`);
    const listed = await requestJson(testServer.baseUrl, '/api/events');

    expect(fetched.status).to.equal(200);
    expect(fetched.body).to.deep.equal(created.body);
    expect(listed.status).to.equal(200);
    expect(listed.body).to.have.length(1);
    expect(listed.body[0]).to.deep.equal(created.body);
  });

  it('returns 404 for GET /api/events/:id when event does not exist', async () => {
    const response = await requestJson(testServer.baseUrl, '/api/events/missing-event');

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Event not found' });
  });

  it('returns an empty list for GET /api/events on a fresh server instance', async () => {
    const response = await requestJson(testServer.baseUrl, '/api/events');

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([]);
  });

  it('returns 204 when deleting a non-existent event and leaves task list unchanged', async () => {
    const event = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Workshop',
        description: 'Hands-on',
        startDate: '2024-08-10',
        endDate: '2024-08-10'
      })
    });

    const task = await requestJson(testServer.baseUrl, '/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Prepare room',
        description: 'Book venue',
        status: 'In Progress',
        eventId: event.body.id
      })
    });

    expect(task.status).to.equal(201);

    const deleted = await fetch(`${testServer.baseUrl}/api/events/non-existent-event`, {
      method: 'DELETE'
    });
    const taskList = await requestJson(testServer.baseUrl, '/api/tasks');
    const filteredTasks = await requestJson(testServer.baseUrl, `/api/tasks?event_id=${event.body.id}`);

    expect(deleted.status).to.equal(204);
    expect(taskList.status).to.equal(200);
    expect(taskList.body).to.have.length(1);
    expect(filteredTasks.body).to.have.length(1);
    expect(filteredTasks.body[0].eventId).to.equal(event.body.id);
  });

  it('returns 400 when creating an event without required fields before any missing-id update attempt', async () => {
    const invalidCreate = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid only'
      })
    });

    const missingUpdate = await requestJson(testServer.baseUrl, '/api/events/still-missing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attempt after invalid create'
      })
    });

    expect(invalidCreate.status).to.equal(400);
    expect(invalidCreate.body).to.deep.equal({
      error: 'Name, startDate, and endDate are required'
    });
    expect(missingUpdate.status).to.equal(404);
    expect(missingUpdate.body).to.deep.equal({ error: 'Event not found' });
  });

  it('returns 400 when creating a task with a missing associated event', async () => {
    const response = await requestJson(testServer.baseUrl, '/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Orphan task',
        description: 'Should fail',
        status: 'To Do',
        eventId: 'evt-999'
      })
    });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });
  });

  it('returns 404 when updating a non-existent task id, covering adjacent task update branch', async () => {
    const response = await requestJson(testServer.baseUrl, '/api/tasks/missing-task', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'No task',
        status: 'Completed',
        eventId: 'whatever'
      })
    });

    expect(response.status).to.equal(404);
    expect(response.body).to.deep.equal({ error: 'Task not found' });
  });
});
