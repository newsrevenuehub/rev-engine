import { isBrowser } from '@analytics/type-utils';

/*

From `hashRegex` through `currentUrl` is adapted from
https://github.com/DavidWells/analytics/blob/
a7bf790f23febd68d5f45926384c7d64df4336b3/packages/
analytics-core/src/modules/page.js

*/

const hashRegex = /#.*$/;

function canonicalUrl() {
  if (!isBrowser) return;
  const tags = document.getElementsByTagName('link');
  for (var i = 0, tag; (tag = tags[i]); i++) {
    if (tag.getAttribute('rel') === 'canonical') {
      return tag.getAttribute('href');
    }
  }
}

function urlPath(url) {
  const regex = /(http[s]?:\/\/)?([^\/\s]+\/)(.*)/g;
  const matches = regex.exec(url);
  const pathMatch = matches && matches[3] ? matches[3].split('?')[0].replace(hashRegex, '') : '';
  return '/' + pathMatch;
}

function currentUrl(search) {
  const canonical = canonicalUrl();
  if (!canonical) return window.location.href.replace(hashRegex, '');
  return canonical.match(/\?/) ? canonical : canonical + search;
}

const GA_SCRIPT_SRC_BASE_URL = 'https://www.googletagmanager.com/gtag/js?id=';

function addGaScript(gaId) {
  const scriptSrc = `${GA_SCRIPT_SRC_BASE_URL}${gaId}`;
  const script = document.createElement('script');
  script.src = scriptSrc;
  script.async = true;
  script.nonce = window.csp_nonce;
  const target = document.getElementsByTagName('script')[0];
  target.parentNode.insertBefore(script, target);
}

function gaIsLoaded(gaId) {
  const scriptSrc = `${GA_SCRIPT_SRC_BASE_URL}${gaId}`;
  return document.querySelectorAll(`script[src='${scriptSrc}']`).length > 0;
}

function gtag() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

function initializeGTagInstance(gaId) {
  gtag('js', new Date());
  gtag('config', gaId, { send_page_view: false });
}

function makeInitializeFn(gaId) {
  return () => {
    if (!gaIsLoaded(gaId)) {
      addGaScript(gaId);
      initializeGTagInstance(gaId);
    }
  };
}

function makePageFn(gaId) {
  return () => {
    const { title } = document;
    const {
      location: { search }
    } = window;
    const url = currentUrl(search);
    const pagePath = urlPath(url);
    gtag('event', 'page_view', {
      page_title: title,
      page_location: url,
      page_path: pagePath,
      send_to: gaId
    });
  };
}

export default function gaV4Plugin(gaId) {
  return {
    name: 'google-analytics-v4',
    initialize: makeInitializeFn(gaId),
    page: makePageFn(gaId),
    loaded: () => gaIsLoaded(gaId),
    track: ({ payload }) => {},
    identify: ({ payload }) => {}
  };
}
