import { REVENGINE_API_VERSION, CSRF_HEADER, CSRF_COOKIE } from 'appSettings';
import Cookies from 'js-cookie';
import axios, { AxiosError } from 'axios';
import { PORTAL } from 'routes';

export const apiBaseUrl = `/api/${REVENGINE_API_VERSION}/`;

const Axios = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true // allow setting/passing cookies
});

export default Axios;

/**
 * A Request interceptor.
 * first callback insets CSRF token from cookie into request headersx
 * second callback handles errors, so pass through
 */
Axios.interceptors.request.use(
  (request) => {
    const token = Cookies.get(CSRF_COOKIE);
    if (token) {
      request.headers[CSRF_HEADER] = token;
    }
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

function handleResponseError(error: AxiosError) {
  if (error?.response?.status === 401) {
    window.location.assign(PORTAL.ENTRY);
  }

  return Promise.reject(error);
}

/**
 * Overrides response interceptor from base Axios instance
 */
Axios.interceptors.response.use((success) => success, handleResponseError);
