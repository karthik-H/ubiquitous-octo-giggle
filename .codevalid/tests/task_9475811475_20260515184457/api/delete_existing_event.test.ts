const registeredRoutes: Array<{ method: string; path: string; handler: any }> = [];
const mockUse = jest.fn();
const mockListen = jest.fn((_port?: number | string, cb?: () => void) => {
  if (cb) cb();
  return { close: jest.fn() };
});

const expressApp = {
  use: mockUse,
  get: jest.fn((path: string, handler: any) => {
    registeredRoutes.push({ method: 'get', path, handler });
    return expressApp;
  }),
  post: jest.fn((path: string, handler: any) => {
    registeredRoutes.push({ method: 'post', path, handler });
    return expressApp;
  }),
  put: jest.fn((path: string, handler: any) => {
    registeredRoutes.push({ method: 'put', path, handler });
    return expressApp;
  }),
  delete: jest.fn((path: string, handler: any) => {
    registeredRoutes.push({ method: 'delete', path, handler });
    return expressApp;
  }),
  listen: mockListen,
};

const expressMock = jest.fn(() => expressApp);
const mockJsonMiddleware = jest.fn(() => 'json-middleware');
const mockCorsMiddleware = jest.fn(() => 'cors-middleware');
const mockBodyParserJson = jest.fn(() => 'body-parser-json-middleware');
const mockUuidV4 = jest.fn();

jest.mock('express', () => {
  const actual = jest.requireActual('express');
  return {
    __esModule: true,
    default: expressMock,
  };
});

jest.mock('cors', () => ({
  __esModule: true,
  default: mockCorsMiddleware,
}));

jest.mock('body-parser', () => ({
  __esModule: true,
  default: {
    json: mockBodyParserJson,
  },
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: mockUuidV4,
}));

import { expect as chaiExpect } from 'chai';

// Jest's global expect is available for mock assertions
declare const expect: any;

type RouteHandler = (req: any, res: any) => any;

type MockResponse = {
  statusCode: number;
  body: any;
  sentBody: any;
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
};

const buildResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {
    statusCode: 200,
    body: undefined,
    sentBody: undefined,
  };

  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res as MockResponse;
  });
  res.json = jest.fn((payload: any) => {
    res.body = payload;
    return res as MockResponse;
  });
  res.send = jest.fn((payload?: any) => {
    res.sentBody = payload;
    return res as MockResponse;
  });

  return res as MockResponse;
};

const loadServer = async () => {
  jest.resetModules();
  registeredRoutes.length = 0;
  mockUse.mockClear();
  mockListen.mockClear();
  expressMock.mockClear();
  mockJsonMiddleware.mockClear();
  mockCorsMiddleware.mockClear();
  mockBodyParserJson.mockClear();
  mockUuidV4.mockReset();
  mockUuidV4
    .mockReturnValueOnce('evt-1')
    .mockReturnValueOnce('task-1')
    .mockReturnValueOnce('evt-2')
    .mockReturnValueOnce('task-2')
    .mockReturnValue('generated-id');

  await import('../../../../server/src/index');

  const getHandler = (method: string, path: string): RouteHandler => {
    const route = registeredRoutes.find(r => r.method === method && r.path === path);
    if (!route) {
      throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
    }
    return route.handler;
  };

  return {
    getHandler,
  };
};

describe('delete_existing_event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('DELETE /api/events/:id removes an existing event and associated tasks, returning 204', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const createTask = getHandler('post', '/api/tasks');
    const listEvents = getHandler('get', '/api/events');
    const listTasks = getHandler('get', '/api/tasks');
    const deleteEvent = getHandler('delete', '/api/events/:id');

    const createEventRes = buildResponse();
    createEvent(
      {
        body: {
          name: 'Expo Launch',
          description: 'Kickoff event',
          startDate: '2026-05-10',
          endDate: '2026-05-11',
        },
      },
      createEventRes,
    );

    chaiExpect(createEventRes.statusCode).to.equal(201);
    chaiExpect(createEventRes.body.id).to.equal('evt-1');

    const createTaskRes = buildResponse();
    createTask(
      {
        body: {
          title: 'Prepare venue',
          description: 'Book and confirm venue',
          status: 'To Do',
          eventId: 'evt-1',
        },
      },
      createTaskRes,
    );

    chaiExpect(createTaskRes.statusCode).to.equal(201);
    chaiExpect(createTaskRes.body.eventId).to.equal('evt-1');

     const deleteRes = buildResponse();
     deleteEvent({ params: { id: 'evt-1' } }, deleteRes);

     expect(deleteRes.status).toHaveBeenCalledWith(204);
     expect(deleteRes.send).toHaveBeenCalledTimes(1);

    const listEventsRes = buildResponse();
    listEvents({ query: {} }, listEventsRes);
    chaiExpect(listEventsRes.statusCode).to.equal(200);
    chaiExpect(listEventsRes.body).to.deep.equal([]);

    const listTasksRes = buildResponse();
    listTasks({ query: {} }, listTasksRes);
    chaiExpect(listTasksRes.statusCode).to.equal(200);
    chaiExpect(listTasksRes.body).to.deep.equal([]);
  });

  it('POST /api/events creates and GET /api/events/:id retrieves the stored event', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const getEvent = getHandler('get', '/api/events/:id');
    const listEvents = getHandler('get', '/api/events');

    const createRes = buildResponse();
    createEvent(
      {
        body: {
          name: 'Alpha Summit',
          description: 'Annual summit',
          startDate: '2026-06-01',
          endDate: '2026-06-02',
        },
      },
      createRes,
    );

    chaiExpect(createRes.statusCode).to.equal(201);
    chaiExpect(createRes.body).to.include({
      id: 'evt-1',
      name: 'Alpha Summit',
      description: 'Annual summit',
      startDate: '2026-06-01',
      endDate: '2026-06-02',
    });

    const getRes = buildResponse();
    getEvent({ params: { id: 'evt-1' } }, getRes);
    chaiExpect(getRes.statusCode).to.equal(200);
    chaiExpect(getRes.body.name).to.equal('Alpha Summit');

    const listRes = buildResponse();
    listEvents({ query: {} }, listRes);
    chaiExpect(listRes.body).to.have.length(1);
    chaiExpect(listRes.body[0].id).to.equal('evt-1');
  });

  it('POST /api/events validates required fields with 400', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const res = buildResponse();

    createEvent(
      {
        body: {
          name: '',
          description: 'Missing required values',
          startDate: '',
          endDate: '2026-07-01',
        },
       },
       res,
     );

     expect(res.status).toHaveBeenCalledWith(400);
     chaiExpect(res.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
  });

  it('PUT /api/events/:id updates an existing event', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const updateEvent = getHandler('put', '/api/events/:id');
    const getEvent = getHandler('get', '/api/events/:id');

    createEvent(
      {
        body: {
          name: 'Beta Conf',
          description: 'Original description',
          startDate: '2026-08-01',
          endDate: '2026-08-02',
        },
      },
      buildResponse(),
    );

    const updateRes = buildResponse();
    updateEvent(
      {
        params: { id: 'evt-1' },
        body: {
          name: 'Beta Conference',
          description: 'Updated description',
          startDate: '2026-08-03',
          endDate: '2026-08-04',
        },
      },
      updateRes,
    );

    chaiExpect(updateRes.statusCode).to.equal(200);
    chaiExpect(updateRes.body).to.include({
      id: 'evt-1',
      name: 'Beta Conference',
      description: 'Updated description',
      startDate: '2026-08-03',
      endDate: '2026-08-04',
    });

    const getRes = buildResponse();
    getEvent({ params: { id: 'evt-1' } }, getRes);
    chaiExpect(getRes.body.name).to.equal('Beta Conference');
  });

  it('PUT /api/events/:id returns 404 for a missing event', async () => {
    const { getHandler } = await loadServer();

    const updateEvent = getHandler('put', '/api/events/:id');
    const res = buildResponse();

    updateEvent(
      {
        params: { id: 'evt-404' },
        body: {
          name: 'Ghost Event',
          description: 'Should not exist',
          startDate: '2026-09-01',
          endDate: '2026-09-02',
        },
       },
       res,
     );

     expect(res.status).toHaveBeenCalledWith(404);
     chaiExpect(res.body).to.deep.equal({ error: 'Event not found' });
  });

  it('POST /api/tasks validates required fields and event existence', async () => {
    const { getHandler } = await loadServer();

    const createTask = getHandler('post', '/api/tasks');

    const missingFieldsRes = buildResponse();
    createTask(
      {
        body: {
          title: '',
          description: 'Incomplete task',
          status: '',
          eventId: '',
        },
       },
       missingFieldsRes,
     );

     expect(missingFieldsRes.status).toHaveBeenCalledWith(400);
     chaiExpect(missingFieldsRes.body).to.deep.equal({ error: 'Title, status, and eventId are required' });

    const unknownEventRes = buildResponse();
    createTask(
      {
        body: {
          title: 'Prepare deck',
          description: 'Slides',
          status: 'To Do',
          eventId: 'evt-missing',
        },
       },
       unknownEventRes,
     );

     expect(unknownEventRes.status).toHaveBeenCalledWith(400);
     chaiExpect(unknownEventRes.body).to.deep.equal({ error: 'Associated event not found' });
  });

  it('PUT /api/tasks/:id updates a task and rejects changing to a missing event', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const createTask = getHandler('post', '/api/tasks');
    const updateTask = getHandler('put', '/api/tasks/:id');
    const listTasks = getHandler('get', '/api/tasks');

    createEvent(
      {
        body: {
          name: 'Gamma Expo',
          description: 'Expo',
          startDate: '2026-10-01',
          endDate: '2026-10-02',
        },
      },
      buildResponse(),
    );

    createTask(
      {
        body: {
          title: 'Arrange booths',
          description: 'Coordinate vendors',
          status: 'To Do',
          eventId: 'evt-1',
        },
      },
      buildResponse(),
    );

    const updateOkRes = buildResponse();
    updateTask(
      {
        params: { id: 'task-1' },
        body: {
          title: 'Arrange booths and seating',
          description: 'Updated',
          status: 'In Progress',
          eventId: 'evt-1',
        },
      },
      updateOkRes,
    );

    chaiExpect(updateOkRes.statusCode).to.equal(200);
    chaiExpect(updateOkRes.body.title).to.equal('Arrange booths and seating');
    chaiExpect(updateOkRes.body.status).to.equal('In Progress');

    const invalidMoveRes = buildResponse();
    updateTask(
      {
        params: { id: 'task-1' },
        body: {
          title: 'Arrange booths and seating',
          description: 'Updated',
          status: 'Completed',
          eventId: 'evt-999',
        },
       },
       invalidMoveRes,
     );

     expect(invalidMoveRes.status).toHaveBeenCalledWith(400);
     chaiExpect(invalidMoveRes.body).to.deep.equal({ error: 'Associated event not found' });

    const listRes = buildResponse();
    listTasks({ query: { event_id: 'evt-1' } }, listRes);
    chaiExpect(listRes.body).to.have.length(1);
    chaiExpect(listRes.body[0].id).to.equal('task-1');
  });

  it('DELETE /api/tasks/:id removes a task independently and returns 204', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const createTask = getHandler('post', '/api/tasks');
    const deleteTask = getHandler('delete', '/api/tasks/:id');
    const listTasks = getHandler('get', '/api/tasks');

    createEvent(
      {
        body: {
          name: 'Delta Meetup',
          description: 'Community meetup',
          startDate: '2026-11-01',
          endDate: '2026-11-01',
        },
      },
      buildResponse(),
    );

    createTask(
      {
        body: {
          title: 'Send invites',
          description: 'Email attendees',
          status: 'To Do',
          eventId: 'evt-1',
        },
      },
      buildResponse(),
     );

     const deleteRes = buildResponse();
     deleteTask({ params: { id: 'task-1' } }, deleteRes);
     expect(deleteRes.status).toHaveBeenCalledWith(204);

    const listRes = buildResponse();
    listTasks({ query: {} }, listRes);
    chaiExpect(listRes.body).to.deep.equal([]);
  });
});
