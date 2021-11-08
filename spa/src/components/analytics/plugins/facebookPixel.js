const FB_PIXEL_SCRIPT_SRC_URL = 'https://connect.facebook.net/en_US/fbevents.js';

export const FB_PIXEL_PLUGIN_NAME = 'facebook-pixel';

// see https://developers.facebook.com/docs/facebook-pixel/implementation
function loadFbPixel() {
  return !(function (f, b, e, v, n, t, s) {
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
    t.nonce = window.csp_nonce;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
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
  return fbq('track', 'PageView');
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
      trackConversion: (amount) => {
        const { fbq } = window;
        fbq('track', 'Donate');
        fbq('track', 'Purchase', { currency: 'USD', value: amount });
      }
    }
  };
}
