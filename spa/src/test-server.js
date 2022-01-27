import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { apiBaseUrl } from 'ajax/axios';

const server = setupServer();

const revengineApi = (path) => {
  return `${apiBaseUrl}${path}`;
};

export { server, rest, revengineApi };
