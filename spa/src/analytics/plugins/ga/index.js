export function guaranteeWindowGa() {
  const scriptSrc = 'https://www.google-analytics.com/analytics.js';
  // Load google analytics script to page
  if (gaNotLoaded(scriptSrc)) {
    /* eslint-disable */
    (function (i, s, o, g, r, a, m) {
      i['GoogleAnalyticsObject'] = r;
      (i[r] =
        i[r] ||
        function () {
          (i[r].q = i[r].q || []).push(arguments);
        }),
        (i[r].l = 1 * new Date());
      (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
      a.async = 1;
      a.src = g;
      m.parentNode.insertBefore(a, m);
    })(window, document, 'script', scriptSrc, 'ga');
    /* eslint-enable */
  }
  return window.ga;
}

export function gaNotLoaded(scriptSrc) {
  if (scriptSrc) {
    return !scriptLoaded(scriptSrc);
  }
  return typeof ga === 'undefined';
}

function scriptLoaded(scriptSrc) {
  const scripts = document.querySelectorAll('script[src]');
  return !!Object.keys(scripts).filter((key) => (scripts[key].src || '') === scriptSrc).length;
}
