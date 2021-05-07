/* istanbul ignore file */
import { rest } from 'msw';
import { setupServer } from 'msw/node';

import { apiBaseUrl } from 'ajax/axios';
import * as endpoints from 'ajax/endpoints';

const handlers = [rest.post(apiBaseUrl + endpoints.TOKEN, loginMock)];

function loginMock(req, res, ctx) {
  console.log(req);

  return res(
    ctx.status(200),
    ctx.json({
      detail: 'success'
    })
  );
}

export const server = setupServer(...handlers);
