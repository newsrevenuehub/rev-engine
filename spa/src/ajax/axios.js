import axios from "axios";
import {
  LS_USER,
  LS_CSRF_TOKEN,
  CSRF_HEADER,
} from "constants/authConstants";

const apiVersion = process.env.REACT_APP_API_VERSION || "v1";

const Axios = axios.create({
  baseURL: `/api/${apiVersion}/`,
  timeout: 5000,
  withCredentials: true, // allow setting/passing cookies
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
Axios.interceptors.response.use(
  (success) => success,
  handleResponseError
);

function handleResponseError(error) {
  if (error?.response) {
    const { status } = error.response;
    // Only care about 403s so far, so pass through
    if (status !== 403) return Promise.reject(error);
    return handle403Response(error);
  }
  return Promise.reject(error);
}

function handle403Response() {
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_CSRF_TOKEN);
  window.location = "/";
}
