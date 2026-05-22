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

describe('missing_required_field_name', () => {
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
    mockUuidV4.mockReturnValue('event-uuid-name-case');
  });

  it('returns 400 when name is missing and does not create an event', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const listEvents = findRoute(routes.get, '/api/events');

    const res = createRes();
    await postEvent(
      {
        body: {
          startDate: '2026-05-20',
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

  it('still creates successfully once the missing name is supplied', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const getById = findRoute(routes.get, '/api/events/:id');

    const createEventRes = createRes();
    await postEvent(
      {
        body: {
          name: 'Named Event',
          description: 'Recovered from validation error',
          startDate: '2026-05-20',
          endDate: '2026-05-21',
        },
      },
      createEventRes,
    );

    expect(createEventRes.statusCode).to.equal(201);
    expect(createEventRes.body.id).to.equal('event-uuid-name-case');

    const getRes = createRes();
    await getById({ params: { id: 'event-uuid-name-case' } }, getRes);
    expect(getRes.statusCode).to.equal(200);
    expect(getRes.body.name).to.equal('Named Event');
  });

  it('returns 404 for GET /api/events/:id when no event exists', async () => {
    const routes = loadRoutes();
    const getById = findRoute(routes.get, '/api/events/:id');
    const res = createRes();

    await getById({ params: { id: 'absent-id' } }, res);

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.deep.equal({ error: 'Event not found' });
  });

  it('returns 204 when deleting a non-existent event to cover delete path', async () => {
    const routes = loadRoutes();
    const deleteEvent = findRoute(routes.delete, '/api/events/:id');
    const listEvents = findRoute(routes.get, '/api/events');

    const deleteRes = createRes();
    await deleteEvent({ params: { id: 'missing-id' } }, deleteRes);

    expect(deleteRes.statusCode).to.equal(204);

    const listRes = createRes();
    await listEvents({ query: {} }, listRes);
    expect(listRes.body).to.deep.equal([]);
  });
});
