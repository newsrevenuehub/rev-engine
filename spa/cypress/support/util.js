import { apiBaseUrl } from 'ajax/axios';

export function getEndpoint(endpoint) {
  return `${apiBaseUrl}${endpoint}`;
}

export function getPageElementByType(fixture, type) {
  return fixture.elements.find((el) => el.type === type);
}

export const EXPECTED_RP_SLUG = 'revenueprogram';

export function getTestingDonationPageUrl(pageSlug = '', queryString = '') {
  return `http://${EXPECTED_RP_SLUG}.revengine-testabc123.com:8000/${pageSlug}${queryString}`;
}

export function getTestingDefaultDonationPageUrl(queryString = '') {
  return `http://${EXPECTED_RP_SLUG}.revengine-testabc123.com:8000/${queryString}`;
}
