import axios from 'axios';
import { LS_USER, LS_CSRF_TOKEN, CSRF_HEADER } from 'constants/authConstants';

export const apiVersion = process.env.REACT_APP_API_VERSION || 'v1';
export const apiBaseUrl = `/api/${apiVersion}/`;

const Axios = axios.create({
  baseURL: apiBaseUrl,
  timeout: 5000,
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

function handle401Response() {
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_CSRF_TOKEN);
  window.location = '/';
}
