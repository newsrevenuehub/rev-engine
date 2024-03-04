import { REVENGINE_API_VERSION } from 'appSettings';
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
 * A Response interceptor.
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
