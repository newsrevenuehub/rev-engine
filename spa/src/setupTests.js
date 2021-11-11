import '@testing-library/jest-dom';
import { server } from 'test-server';

beforeAll(() => {
  // establish API mocking
  server.listen();
});

afterEach(() => {
  // reset any request handlers that are declared as a part of our tests
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
