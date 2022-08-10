import { rest } from 'msw';
import { apiBaseUrl } from 'ajax/axios';
import { GET_MAGIC_LINK } from 'ajax/endpoints';

export const revengineApi = (path) => {
  return `${apiBaseUrl}${path}`;
};

export const handlers = [
  rest.post(revengineApi(GET_MAGIC_LINK), (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        detail: 'success'
      })
    )
  )
];
