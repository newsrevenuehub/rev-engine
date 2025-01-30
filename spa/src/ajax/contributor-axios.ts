import { CSRF_HEADER, REVENGINE_API_VERSION } from 'appSettings';
import axios from 'axios';
import Cookies from 'universal-cookie';
export const apiBaseUrl = `/api/${REVENGINE_API_VERSION}/`;

/**
 * An Axios instance configured for use on contribution pages. There is no
 * authentication involved here, but we need to send the CSRF token present in
 * cookies as a request header.
 */
export const contributorAxios = axios.create({
  baseURL: apiBaseUrl,
  timeout: 7000,
  withCredentials: true
});

contributorAxios.interceptors.request.use((config) => {
  config.headers[CSRF_HEADER] = new Cookies(null).get('csrftoken');
  return config;
});
