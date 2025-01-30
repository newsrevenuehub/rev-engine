import { REVENGINE_API_VERSION } from 'appSettings';
import axios from 'axios';

export const apiBaseUrl = `/api/${REVENGINE_API_VERSION}/`;

/**
 * An Axios instance configured for use on contribution pages. There is no
 * authentication involved here.
 */
export const contributorAxios = axios.create({
  baseURL: apiBaseUrl,
  timeout: 7000,
  withCredentials: true // allow setting/passing cookies
});
