import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { apiBaseUrl } from 'ajax/axios';

const server = setupServer();

server.listen({
  // Log unhanlded requests for debugging.
  // NOTE: This does not currently seem to work. It sure would be nice though.
  onUnhandledRequest(req) {
    console.log('Found an unhandled %s request to %s', req.method, req.url.href);
  }
});

const revengineApi = (path) => {
  return `${apiBaseUrl}${path}`;
};

export { server, rest, revengineApi };
