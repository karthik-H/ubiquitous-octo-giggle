import { expect } from 'chai';
import express from 'express';
import http, { AddressInfo } from 'http';

const SERVER_MODULE_PATH = '../../../server/src/index';

type TestServer = {
  app: express.Express;
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
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    app,
    server,
    baseUrl,
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

describe('happy_path_event_update', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createServer();
  });

  afterEach(async () => {
    await testServer.close();
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('updates an existing event and returns the merged event payload', async () => {
    const created = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Meeting',
        description: 'Sync',
        startDate: '2023-10-01',
        endDate: '2023-10-02'
      })
    });

    expect(created.status).to.equal(201);
    expect(created.body.name).to.equal('Meeting');

    const updated = await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Meeting',
        description: 'New sync',
        startDate: '2023-10-05',
        endDate: '2023-10-06'
      })
    });

    expect(updated.status).to.equal(200);
    expect(updated.body).to.deep.equal({
      id: created.body.id,
      name: 'Updated Meeting',
      description: 'New sync',
      startDate: '2023-10-05',
      endDate: '2023-10-06'
    });
  });

  it('returns the updated event from GET /api/events/:id after a successful update', async () => {
    const created = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Planning',
        description: 'Initial plan',
        startDate: '2024-01-01',
        endDate: '2024-01-02'
      })
    });

    await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Planning Revised',
        description: 'Revised plan',
        startDate: '2024-02-01',
        endDate: '2024-02-03'
      })
    });

    const fetched = await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`);

    expect(fetched.status).to.equal(200);
    expect(fetched.body).to.deep.equal({
      id: created.body.id,
      name: 'Planning Revised',
      description: 'Revised plan',
      startDate: '2024-02-01',
      endDate: '2024-02-03'
    });
  });

  it('lists updated events through GET /api/events', async () => {
    const created = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kickoff',
        description: 'Start work',
        startDate: '2024-03-10',
        endDate: '2024-03-11'
      })
    });

    await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kickoff Updated',
        description: 'Start work updated',
        startDate: '2024-03-12',
        endDate: '2024-03-13'
      })
    });

    const listed = await requestJson(testServer.baseUrl, '/api/events');

    expect(listed.status).to.equal(200);
    expect(listed.body).to.be.an('array');
    expect(listed.body).to.have.length(1);
    expect(listed.body[0]).to.deep.equal({
      id: created.body.id,
      name: 'Kickoff Updated',
      description: 'Start work updated',
      startDate: '2024-03-12',
      endDate: '2024-03-13'
    });
  });

  it('supports partial update semantics by overwriting omitted fields with undefined when not supplied', async () => {
    const created = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Design Review',
        description: 'Review design',
        startDate: '2024-04-01',
        endDate: '2024-04-02'
      })
    });

    const updated = await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Design Review Final'
      })
    });

    expect(updated.status).to.equal(200);
    expect(updated.body.id).to.equal(created.body.id);
    expect(updated.body.name).to.equal('Design Review Final');
    expect(updated.body).to.have.property('description');
    expect(updated.body.description).to.equal(undefined);
    expect(updated.body.startDate).to.equal(undefined);
    expect(updated.body.endDate).to.equal(undefined);
  });

  it('deletes an updated event and subsequent fetch returns not found', async () => {
    const created = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Town Hall',
        description: 'All hands',
        startDate: '2024-05-01',
        endDate: '2024-05-01'
      })
    });

    await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Town Hall Updated',
        description: 'All hands updated',
        startDate: '2024-05-02',
        endDate: '2024-05-02'
      })
    });

    const deleted = await fetch(`${testServer.baseUrl}/api/events/${created.body.id}`, {
      method: 'DELETE'
    });
    const fetched = await requestJson(testServer.baseUrl, `/api/events/${created.body.id}`);

    expect(deleted.status).to.equal(204);
    expect(fetched.status).to.equal(404);
    expect(fetched.body).to.deep.equal({ error: 'Event not found' });
  });

  it('deleting an event also removes associated tasks from task listings', async () => {
    const createdEvent = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Conference',
        description: 'Annual conference',
        startDate: '2024-06-01',
        endDate: '2024-06-03'
      })
    });

    const createdTask = await requestJson(testServer.baseUrl, '/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Prepare slides',
        description: 'Draft presentation',
        status: 'To Do',
        eventId: createdEvent.body.id
      })
    });

    expect(createdTask.status).to.equal(201);

    const filteredBeforeDelete = await requestJson(
      testServer.baseUrl,
      `/api/tasks?event_id=${createdEvent.body.id}`
    );
    expect(filteredBeforeDelete.status).to.equal(200);
    expect(filteredBeforeDelete.body).to.have.length(1);

    const deleted = await fetch(`${testServer.baseUrl}/api/events/${createdEvent.body.id}`, {
      method: 'DELETE'
    });
    const filteredAfterDelete = await requestJson(
      testServer.baseUrl,
      `/api/tasks?event_id=${createdEvent.body.id}`
    );

    expect(deleted.status).to.equal(204);
    expect(filteredAfterDelete.status).to.equal(200);
    expect(filteredAfterDelete.body).to.deep.equal([]);
  });

  it('returns 400 when creating an event without required fields', async () => {
    const response = await requestJson(testServer.baseUrl, '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Missing name and dates'
      })
    });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({
      error: 'Name, startDate, and endDate are required'
    });
  });

  it('returns 400 when creating a task for a non-existent event', async () => {
    const response = await requestJson(testServer.baseUrl, '/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Ghost task',
        description: 'No event',
        status: 'To Do',
        eventId: 'missing-event'
      })
    });

    expect(response.status).to.equal(400);
    expect(response.body).to.deep.equal({ error: 'Associated event not found' });
  });
});
