import { PORTAL } from 'routes';
import Axios from './axios';
import { AxiosError } from 'axios';

export default Axios;

/**
 * Overrides response interceptor from base Axios instance
 */
Axios.interceptors.response.use((success) => success, handleResponseError);

function handleResponseError(error: AxiosError) {
  if (error?.name === 'AuthenticationError') return window.location.assign(PORTAL.ENTRY);
  return Promise.reject(error);
}
