import MockAdapter from 'axios-mock-adapter';
import { LS_CSRF_TOKEN, CSRF_HEADER } from 'appSettings';
import { contributorAxios } from './contributor-axios';

jest.mock('appSettings', () => ({
  CSRF_HEADER: 'csrf_header',
  LS_CSRF_TOKEN: 'ls_csrf_token',
  REVENGINE_API_VERSION: 'revengine_api_version'
}));

describe('contributor Axios instance', () => {
  const contributorAxiosMock = new MockAdapter(contributorAxios);

  afterAll(() => {
    document.cookie = '';
    window.localStorage.clear();
  });

  beforeEach(() => {
    window.localStorage.clear();
    contributorAxiosMock.reset();
    contributorAxiosMock.onGet().reply(200);
    document.cookie = '';
  });

  it('prepends URLs with the API path', async () => {
    await contributorAxios.get('url');
    expect(contributorAxiosMock.history.get).toHaveLength(1);
    expect(contributorAxiosMock.history.get[0].url).toBe('url');
    expect(contributorAxiosMock.history.get[0].baseURL).toBe('/api/revengine_api_version/');
  });

  it("doesn't pass a CSRF token if present in local storage", async () => {
    window.localStorage.setItem(LS_CSRF_TOKEN, 'value');
    await contributorAxios.get('url');
    expect(contributorAxiosMock.history.get).toHaveLength(1);
    expect(contributorAxiosMock.history.get[0].headers![CSRF_HEADER]).toBeUndefined();
  });

  it('passes a CSRF token if present as a cookie', async () => {
    document.cookie = 'csrftoken=test-value';
    await contributorAxios.get('url');
    expect(contributorAxiosMock.history.get).toHaveLength(1);
    expect(contributorAxiosMock.history.get[0].headers![CSRF_HEADER]).toBe('test-value');
  });
});
