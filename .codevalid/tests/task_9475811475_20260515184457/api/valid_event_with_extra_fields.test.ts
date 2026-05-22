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

describe('valid_event_with_extra_fields', () => {
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
    mockUuidV4.mockReturnValue('event-uuid-extra-fields');
  });

  it('ignores unknown fields during event creation', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const res = createRes();

    await postEvent(
      {
        body: {
          name: 'Extra Fields Event',
          description: 'Known description',
          startDate: '2026-08-01',
          endDate: '2026-08-02',
          location: 'Hidden Venue',
          owner: 'Unexpected Owner',
          metadata: { flag: true },
        },
      },
      res,
    );

    expect(res.statusCode).to.equal(201);
    expect(res.body).to.deep.equal({
      id: 'event-uuid-extra-fields',
      name: 'Extra Fields Event',
      description: 'Known description',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
    });
    expect(Object.prototype.hasOwnProperty.call(res.body, 'location')).to.equal(false);
    expect(Object.prototype.hasOwnProperty.call(res.body, 'owner')).to.equal(false);
    expect(Object.prototype.hasOwnProperty.call(res.body, 'metadata')).to.equal(false);
  });

  it('returns only expected fields when listing and fetching the stored event', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const listEvents = findRoute(routes.get, '/api/events');
    const getById = findRoute(routes.get, '/api/events/:id');

    await postEvent(
      {
        body: {
          name: 'Trimmed Payload Event',
          description: 'Stored cleanly',
          startDate: '2026-08-03',
          endDate: '2026-08-04',
          location: 'Ignored Again',
        },
      },
      createRes(),
    );

    const listRes = createRes();
    await listEvents({ query: {} }, listRes);
    expect(listRes.statusCode).to.equal(200);
    expect(listRes.body).to.deep.equal([
      {
        id: 'event-uuid-extra-fields',
        name: 'Trimmed Payload Event',
        description: 'Stored cleanly',
        startDate: '2026-08-03',
        endDate: '2026-08-04',
      },
    ]);

    const getRes = createRes();
    await getById({ params: { id: 'event-uuid-extra-fields' } }, getRes);
    expect(getRes.statusCode).to.equal(200);
    expect(Object.prototype.hasOwnProperty.call(getRes.body, 'location')).to.equal(false);
  });

  it('updates only the known fields on PUT /api/events/:id', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const updateEvent = findRoute(routes.put, '/api/events/:id');

    await postEvent(
      {
        body: {
          name: 'Updatable Event',
          description: 'Before update',
          startDate: '2026-08-05',
          endDate: '2026-08-06',
          location: 'Ignored Create',
        },
      },
      createRes(),
    );

    const updateRes = createRes();
    await updateEvent(
      {
        params: { id: 'event-uuid-extra-fields' },
        body: {
          name: 'Updatable Event Revised',
          description: 'After update',
          startDate: '2026-08-07',
          endDate: '2026-08-08',
          owner: 'Ignored Update',
        },
      },
      updateRes,
    );

    expect(updateRes.statusCode).to.equal(200);
    expect(updateRes.body).to.deep.equal({
      id: 'event-uuid-extra-fields',
      name: 'Updatable Event Revised',
      description: 'After update',
      startDate: '2026-08-07',
      endDate: '2026-08-08',
    });
    expect(Object.prototype.hasOwnProperty.call(updateRes.body, 'owner')).to.equal(false);
  });

  it('deletes the event and confirms the list is empty afterward', async () => {
    const routes = loadRoutes();
    const postEvent = findRoute(routes.post, '/api/events');
    const deleteEvent = findRoute(routes.delete, '/api/events/:id');
    const listEvents = findRoute(routes.get, '/api/events');

    await postEvent(
      {
        body: {
          name: 'Delete Extra Fields Event',
          description: 'Will be removed',
          startDate: '2026-08-09',
          endDate: '2026-08-10',
          location: 'Ignored Delete Path',
        },
      },
      createRes(),
    );

    const deleteRes = createRes();
    await deleteEvent({ params: { id: 'event-uuid-extra-fields' } }, deleteRes);
    expect(deleteRes.statusCode).to.equal(204);

    const listRes = createRes();
    await listEvents({ query: {} }, listRes);
    expect(listRes.body).to.deep.equal([]);
  });
});
