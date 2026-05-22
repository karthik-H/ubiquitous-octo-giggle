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

jest.mock('express', () => {
  return {
    __esModule: true,
    default: expressFactory,
  };
});

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

describe('happy_path_valid_event', () => {
  const loadRoutes = () => {
    jest.isolateModules(() => {
      require('../../../../server/src/index');
    });

    const app = expressInstances[expressInstances.length - 1];
    return app.__routes as {
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
    if (!route) {
      throw new Error(`Route not found: ${path}`);
    }
    return route.handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    expressInstances.length = 0;
    mockUuidV4.mockReturnValue('event-uuid-001');
  });

  it('creates an event and returns 201 with stored payload', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const listEvents = findRoute(routes.get, '/api/events');

    const req: any = {
      body: {
        name: 'Alpha Launch',
        description: 'Initial release event',
        startDate: '2026-05-15',
        endDate: '2026-05-16',
      },
    };
    const res = createRes();

    await postEvent(req, res);

    expect(mockUuidV4).to.have.property('mock');
    expect(mockUuidV4).to.have.property('mock.calls');
    expect(mockUuidV4.mock.calls.length).to.equal(1);
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.deep.equal({
      id: 'event-uuid-001',
      name: 'Alpha Launch',
      description: 'Initial release event',
      startDate: '2026-05-15',
      endDate: '2026-05-16',
    });

    const listRes = createRes();
    await listEvents({ query: {} }, listRes);
    expect(listRes.statusCode).to.equal(200);
    expect(listRes.body).to.deep.equal([res.body]);
  });

  it('returns the stored event from GET /api/events/:id after creation', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const getById = findRoute(routes.get, '/api/events/:id');

    const createRes = createRes();
    await postEvent(
      {
        body: {
          name: 'Alpha Summit',
          description: 'Summit details',
          startDate: '2026-06-01',
          endDate: '2026-06-02',
        },
      },
      createRes,
    );

    const getRes = createRes();
    await getById({ params: { id: 'event-uuid-001' } }, getRes);

    expect(getRes.statusCode).to.equal(200);
    expect(getRes.body).to.deep.equal(createRes.body);
  });

  it('updates an existing event through PUT /api/events/:id', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const updateEvent = findRoute(routes.put, '/api/events/:id');

    await postEvent(
      {
        body: {
          name: 'Alpha Expo',
          description: 'Old description',
          startDate: '2026-07-10',
          endDate: '2026-07-11',
        },
      },
      createRes(),
    );

    const updateRes = createRes();
    await updateEvent(
      {
        params: { id: 'event-uuid-001' },
        body: {
          name: 'Alpha Expo Updated',
          description: 'New description',
          startDate: '2026-07-12',
          endDate: '2026-07-13',
        },
      },
      updateRes,
    );

    expect(updateRes.statusCode).to.equal(200);
    expect(updateRes.body).to.deep.equal({
      id: 'event-uuid-001',
      name: 'Alpha Expo Updated',
      description: 'New description',
      startDate: '2026-07-12',
      endDate: '2026-07-13',
    });
  });

  it('returns 404 when updating a missing event', async () => {
    const routes = loadRoutes();
    const updateEvent = findRoute(routes.put, '/api/events/:id');
    const res = createRes();

    await updateEvent(
      {
        params: { id: 'missing-event' },
        body: {
          name: 'Ghost Event',
          description: 'No-op',
          startDate: '2026-01-01',
          endDate: '2026-01-02',
        },
      },
      res,
    );

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.deep.equal({ error: 'Event not found' });
  });

  it('deletes an existing event and it no longer appears in list results', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const deleteEvent = findRoute(routes.delete, '/api/events/:id');
    const listEvents = findRoute(routes.get, '/api/events');

    await postEvent(
      {
        body: {
          name: 'Alpha Removal',
          description: 'To be deleted',
          startDate: '2026-08-01',
          endDate: '2026-08-02',
        },
      },
      createRes(),
    );

    const deleteRes = createRes();
    await deleteEvent({ params: { id: 'event-uuid-001' } }, deleteRes);

    expect(deleteRes.statusCode).to.equal(204);

    const listRes = createRes();
    await listEvents({ query: {} }, listRes);
    expect(listRes.statusCode).to.equal(200);
    expect(listRes.body).to.deep.equal([]);
  });
});
