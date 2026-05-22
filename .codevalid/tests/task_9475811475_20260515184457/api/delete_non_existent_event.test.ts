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
   mockCorsMiddleware.mockClear();
   mockBodyParserJson.mockClear();
   mockUuidV4.mockReset();
   mockUuidV4
     .mockReturnValueOnce('evt-2')
     .mockReturnValueOnce('task-2')
     .mockReturnValueOnce('evt-3')
     .mockReturnValueOnce('task-3')
     .mockReturnValue('generated-id');

  await import('../../../../server/src/index');

  const getHandler = (method: string, path: string): RouteHandler => {
    const route = registeredRoutes.find(r => r.method === method && r.path === path);
    if (!route) {
      throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
    }
    return route.handler;
  };

  return { getHandler };
};

describe('delete_non_existent_event', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('DELETE /api/events/:id returns 204 and leaves existing events/tasks unchanged when id does not exist', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const createTask = getHandler('post', '/api/tasks');
    const deleteEvent = getHandler('delete', '/api/events/:id');
    const listEvents = getHandler('get', '/api/events');
    const listTasks = getHandler('get', '/api/tasks');

    createEvent(
      {
        body: {
          name: 'Existing Event',
          description: 'Still present',
          startDate: '2026-12-01',
          endDate: '2026-12-02',
        },
      },
      buildResponse(),
    );

    createTask(
      {
        body: {
          title: 'Existing Task',
          description: 'Linked task',
          status: 'To Do',
          eventId: 'evt-2',
        },
      },
      buildResponse(),
    );

     const deleteRes = buildResponse();
     deleteEvent({ params: { id: 'evt-999' } }, deleteRes);

     expect(deleteRes.status).toHaveBeenCalledWith(204);
     expect(deleteRes.send).toHaveBeenCalledTimes(1);

    const eventsRes = buildResponse();
    listEvents({ query: {} }, eventsRes);
    chaiExpect(eventsRes.body).to.have.length(1);
    chaiExpect(eventsRes.body[0]).to.include({ id: 'evt-2', name: 'Existing Event' });

    const tasksRes = buildResponse();
    listTasks({ query: {} }, tasksRes);
    chaiExpect(tasksRes.body).to.have.length(1);
    chaiExpect(tasksRes.body[0]).to.include({ id: 'task-2', eventId: 'evt-2' });
  });

  it('GET /api/events/:id returns 404 when the event does not exist', async () => {
    const { getHandler } = await loadServer();

    const getEvent = getHandler('get', '/api/events/:id');
    const res = buildResponse();

     getEvent({ params: { id: 'evt-999' } }, res);

     expect(res.status).toHaveBeenCalledWith(404);
    chaiExpect(res.body).to.deep.equal({ error: 'Event not found' });
  });

   it('GET /api/events returns all events after creating multiple records', async () => {
     const { getHandler } = await loadServer();

     const createEvent = getHandler('post', '/api/events');
     const listEvents = getHandler('get', '/api/events');

     createEvent(
       {
         body: {
           name: 'Event One',
           description: 'First',
           startDate: '2027-01-01',
           endDate: '2027-01-02',
         },
       },
       buildResponse(),
     );

     createEvent(
       {
         body: {
           name: 'Event Two',
           description: 'Second',
           startDate: '2027-01-03',
           endDate: '2027-01-04',
         },
       },
       buildResponse(),
     );

     const listRes = buildResponse();
     listEvents({ query: {} }, listRes);

      chaiExpect(listRes.statusCode).to.equal(200);
      chaiExpect(listRes.body).to.have.length(2);
      chaiExpect(listRes.body.map((item: any) => item.id)).to.deep.equal(['evt-2', 'task-2']);
   });

  it('PUT /api/events/:id preserves id and can set optional fields to undefined when omitted', async () => {
    const { getHandler } = await loadServer();

    const createEvent = getHandler('post', '/api/events');
    const updateEvent = getHandler('put', '/api/events/:id');

    createEvent(
      {
        body: {
          name: 'Mutable Event',
          description: 'Before update',
          startDate: '2027-02-01',
          endDate: '2027-02-02',
        },
      },
      buildResponse(),
    );

    const updateRes = buildResponse();
    updateEvent(
      {
        params: { id: 'evt-2' },
        body: {
          name: 'Mutable Event Updated',
        },
      },
      updateRes,
    );

    chaiExpect(updateRes.statusCode).to.equal(200);
    chaiExpect(updateRes.body.id).to.equal('evt-2');
    chaiExpect(updateRes.body.name).to.equal('Mutable Event Updated');
    chaiExpect(updateRes.body.description).to.equal(undefined);
  });

   it('GET /api/tasks filters by event_id query parameter', async () => {
     const { getHandler } = await loadServer();

     const createEvent = getHandler('post', '/api/events');
     const createTask = getHandler('post', '/api/tasks');
     const listTasks = getHandler('get', '/api/tasks');

     createEvent(
       {
         body: {
           name: 'Parent One',
           description: 'A',
           startDate: '2027-03-01',
           endDate: '2027-03-02',
         },
       },
       buildResponse(),
     );

     createEvent(
       {
         body: {
           name: 'Parent Two',
           description: 'B',
           startDate: '2027-03-03',
           endDate: '2027-03-04',
         },
       },
       buildResponse(),
     );

     createTask(
       {
         body: {
           title: 'Task for first event',
           description: 'First link',
           status: 'To Do',
           eventId: 'evt-2',
         },
       },
       buildResponse(),
     );

     createTask(
       {
         body: {
           title: 'Task for second event',
           description: 'Second link',
           status: 'In Progress',
           eventId: 'task-2',
         },
       },
       buildResponse(),
     );

     const filteredRes = buildResponse();
     listTasks({ query: { event_id: 'task-2' } }, filteredRes);

     chaiExpect(filteredRes.statusCode).to.equal(200);
     chaiExpect(filteredRes.body).to.have.length(1);
     chaiExpect(filteredRes.body[0].eventId).to.equal('task-2');
   });

   it('PUT /api/tasks/:id returns 404 when the task does not exist', async () => {
     const { getHandler } = await loadServer();

     const updateTask = getHandler('put', '/api/tasks/:id');
     const res = buildResponse();

     updateTask(
       {
         params: { id: 'task-999' },
         body: {
           title: 'Missing task',
           description: 'No-op',
           status: 'Completed',
           eventId: 'evt-2',
         },
       },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      chaiExpect(res.body).to.deep.equal({ error: 'Task not found' });
   });

    it('server startup wiring registers middleware and calls listen once during import', async () => {
      await loadServer();

      expect(expressMock).toHaveBeenCalledTimes(1);
      expect(mockCorsMiddleware).toHaveBeenCalledTimes(1);
      expect(mockBodyParserJson).toHaveBeenCalledTimes(1);
      expect(mockUse.mock.calls.length).toEqual(2);
      // Routes are registered on the mock app during initialization
      expect(registeredRoutes.length).toBeGreaterThan(0);
    });
});
