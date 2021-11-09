import axios from 'axios';
import { LS_CSRF_TOKEN, CSRF_HEADER } from 'constants/authConstants';
import { TOKEN } from './endpoints';
import { REACT_APP_API_VERSION } from 'settings';

export const apiBaseUrl = `/api/${REACT_APP_API_VERSION}/`;

const Axios = axios.create({
  baseURL: apiBaseUrl,
  timeout: 7000,
  withCredentials: true // allow setting/passing cookies
});

export default Axios;

/**
 * A Request interceptor.
 * first callback intercepts successfully formed requests
 * second callback handles errors, so pass through
 */
Axios.interceptors.request.use(
  (request) => {
    const csrfToken = localStorage.getItem(LS_CSRF_TOKEN);
    if (csrfToken) request.headers[CSRF_HEADER] = csrfToken;
    return request;
  },
  (error) => Promise.reject(error)
);

/**
 * A Response interceptor.
 * first callback handles success, so pass through
 * second callback handles errors
 */
Axios.interceptors.response.use((success) => success, handleResponseError);

function handleResponseError(error) {
  if (error?.response?.status === 401) return handle401Response(error);
  return Promise.reject(error);
}

function handle401Response(error) {
  /*
    If it's a 401, we want to handle two different cases:
    1. It's a 401 on login, in which case error.response contains useful error messages
    2. It's a 401 on some other call, in which case we want to reject with a special error 
       that, when caught, will affect the display of the re-auth modal.
  */
  if (error.config.url === TOKEN) return Promise.reject(error);
  else return Promise.reject(new AuthenticationError('User token expired'));
}

export class AuthenticationError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = 'AuthenticationError';
  }
}
