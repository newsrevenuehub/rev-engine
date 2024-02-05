import { PENDO_API_KEY } from 'appSettings';

/**
 * We need to ensure the Pendo script only ever runs once. This records it
 * globally so that if the function below is invoked multiple times, there's
 * only one active one in the DOM.
 */
let loaderScript: HTMLElement;

/**
 * Initializes Pendo globally. This can be called multiple times safely; it will
 * only ever load Pendo once.
 *
 * This resolves when Pendo *should* be available, but make sure to check for
 * the presence of `window.pendo` before using any function on it.
 */
export function loadPendo() {
  if (!PENDO_API_KEY) {
    throw new Error('Pendo configuration is missing');
  }

  if (loaderScript?.isConnected) {
    // Another invocation of this function already ran and presumably
    // initialized Pendo. It's possible the loader script was removed after it
    // was added to the DOM by us, probably in a test context.
    return;
  }

  loaderScript = document.createElement('script');
  loaderScript.setAttribute('nonce', (window as any).csp_nonce);
  loaderScript.innerHTML = `(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track'];for(w=0,x=v.length;w<x;++w)(function(m){
        o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
        y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
        z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('${PENDO_API_KEY}');`;
  document.body.appendChild(loaderScript);

  // Await the execution of the script tag above. We can't use the load event
  // because it's inline script.

  return Promise.resolve();
}
