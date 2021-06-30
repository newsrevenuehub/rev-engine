import { apiBaseUrl } from 'ajax/axios';

export function getEndpoint(endpoint) {
  return `${apiBaseUrl}${endpoint}`;
}

export function getPageElementByType(fixture, type) {
  return fixture.elements.find((el) => el.type === type);
}
