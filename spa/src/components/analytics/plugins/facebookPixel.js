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

const FB_PIXEL_SCRIPT_SRC_URL = 'https://connect.facebook.net/en_US/fbevents.js';

export const FB_PIXEL_PLUGIN_NAME = 'facebook-pixel';

// see https://developers.facebook.com/docs/facebook-pixel/implementation
function loadFbPixel() {
  return !(function (f, b, e, v, n, t, s) {
    {
      if (f.fbq) return;
      n = f.fbq = function () {
        return n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }
  })(window, document, 'script', FB_PIXEL_SCRIPT_SRC_URL);
}

function initializePixelClient(fbId) {
  const { fbq } = window;
  fbq('init', fbId);
}

function makeInitializeFn(fbId) {
  return () => {
    loadFbPixel();
    initializePixelClient(fbId);
  };
}

function isLoaded(fbId) {
  return document.querySelectorAll(`script[src='${FB_PIXEL_SCRIPT_SRC_URL}']`).length > 0;
}

function page() {
  const { fbq } = window;
  fbq('track', 'PageView');
}

export default function fbPixel(fbId) {
  return {
    name: FB_PIXEL_PLUGIN_NAME,
    initialize: makeInitializeFn(fbId),
    page,
    loaded: () => isLoaded(fbId),
    track: ({ payload }) => {},
    identify: ({ payload }) => {},
    methods: {
      trackConversion: () => {
        const { fbq } = window;
        fbq('track', 'Donate');
        fbq('track', 'Purchase', { currency: 'USD' });
      }
    }
  };
}
