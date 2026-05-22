const mockUuidV4 = jest.fn();

type Handler = (req: any, res: any) => any;

type RegisteredRoute = {
  path: string;
  handler: Handler;
};

const expressInstances: any[] = [];

const expressFactory = jest.fn(() => {
  const routes = {
    get: [] as RegisteredRoute[],
    post: [] as RegisteredRoute[],
    put: [] as RegisteredRoute[],
    delete: [] as RegisteredRoute[],
  };

  const app = {
    __routes: routes,
    use: jest.fn(),
    get: jest.fn((path: string, handler: Handler) => {
      routes.get.push({ path, handler });
      return app;
    }),
    post: jest.fn((path: string, handler: Handler) => {
      routes.post.push({ path, handler });
      return app;
    }),
    put: jest.fn((path: string, handler: Handler) => {
      routes.put.push({ path, handler });
      return app;
    }),
    delete: jest.fn((path: string, handler: Handler) => {
      routes.delete.push({ path, handler });
      return app;
    }),
    listen: jest.fn((_port: any, callback?: () => void) => {
      if (callback) callback();
      return { close: jest.fn() };
    }),
  };

  expressInstances.push(app);
  return app;
});

jest.mock('express', () => ({
  __esModule: true,
  default: expressFactory,
}));

jest.mock('cors', () => ({
  __esModule: true,
  default: jest.fn(() => 'cors-middleware'),
}));

jest.mock('body-parser', () => ({
  __esModule: true,
  default: {
    json: jest.fn(() => 'json-middleware'),
  },
}));

jest.mock('uuid', () => ({
  v4: mockUuidV4,
}));

import { expect } from 'chai';

describe('missing_required_field_startDate', () => {
  const loadRoutes = () => {
    jest.isolateModules(() => {
      require('../../../../server/src/index');
    });
    return expressInstances[expressInstances.length - 1].__routes as {
      get: RegisteredRoute[];
      post: RegisteredRoute[];
      put: RegisteredRoute[];
      delete: RegisteredRoute[];
    };
  };

  const createRes = () => {
    const res: any = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn((payload: any) => {
      res.body = payload;
      return res;
    });
    res.send = jest.fn((payload?: any) => {
      res.body = payload;
      return res;
    });
    return res;
  };

  const findRoute = (routes: RegisteredRoute[], path: string) => {
    const route = routes.find((entry) => entry.path === path);
    if (!route) throw new Error(`Route not found: ${path}`);
    return route.handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    expressInstances.length = 0;
    mockUuidV4.mockReturnValue('event-uuid-start-date');
  });

  it('returns 400 when startDate is missing', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const listEvents = findRoute(routes.get, '/api/events');
    const res = createRes();

    await postEvent(
      {
        body: {
          name: 'Event Without Start',
          endDate: '2026-05-21',
        },
      },
      res,
    );

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.deep.equal({ error: 'Name, startDate, and endDate are required' });
    expect(mockUuidV4.mock.calls.length).to.equal(0);

    const listRes = createRes();
    await listEvents({ query: {} }, listRes);
    expect(listRes.body).to.deep.equal([]);
  });

  it('creates and then updates an event once startDate is provided', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const updateEvent = findRoute(routes.put, '/api/events/:id');

    const createEventRes = createRes();
    await postEvent(
      {
        body: {
          name: 'Event With Start',
          description: 'Now valid',
          startDate: '2026-05-20',
          endDate: '2026-05-21',
        },
      },
      createEventRes,
    );

    expect(createEventRes.statusCode).to.equal(201);

    const updateRes = createRes();
    await updateEvent(
      {
        params: { id: 'event-uuid-start-date' },
        body: {
          name: 'Event With Start Updated',
          description: 'Updated description',
          startDate: '2026-05-22',
          endDate: '2026-05-23',
        },
      },
      updateRes,
    );

    expect(updateRes.statusCode).to.equal(200);
    expect(updateRes.body).to.deep.equal({
      id: 'event-uuid-start-date',
      name: 'Event With Start Updated',
      description: 'Updated description',
      startDate: '2026-05-22',
      endDate: '2026-05-23',
    });
  });

  it('returns 404 when updating a missing event id', async () => {
    const routes = loadRoutes();
    const updateEvent = findRoute(routes.put, '/api/events/:id');
    const res = createRes();

    await updateEvent(
      {
        params: { id: 'unknown-id' },
        body: {
          name: 'Unknown',
          description: 'Missing',
          startDate: '2026-05-20',
          endDate: '2026-05-21',
        },
      },
      res,
    );

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.deep.equal({ error: 'Event not found' });
  });

  it('deletes an event after successful creation', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const deleteEvent = findRoute(routes.delete, '/api/events/:id');
    const getById = findRoute(routes.get, '/api/events/:id');

    await postEvent(
      {
        body: {
          name: 'Disposable Event',
          description: 'Delete me',
          startDate: '2026-05-20',
          endDate: '2026-05-21',
        },
      },
      createRes(),
    );

    const deleteRes = createRes();
    await deleteEvent({ params: { id: 'event-uuid-start-date' } }, deleteRes);
    expect(deleteRes.statusCode).to.equal(204);

    const getRes = createRes();
    await getById({ params: { id: 'event-uuid-start-date' } }, getRes);
    expect(getRes.statusCode).to.equal(404);
  });
});
