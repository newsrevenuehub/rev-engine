import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, revengineApi } from 'test-handlers';

const server = setupServer(...handlers);

export { server, rest, revengineApi };
