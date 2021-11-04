import { useEffect } from 'react';

// Utils
import isEmpty from 'lodash.isempty';
import scrollIntoView from 'scroll-into-view';

const scrollOptions = { time: 200 };

/**
 * Given a ref to a form, and an object of errors whose keys match form input 'name' attributes,
 * focus the first input in the form that has an error.
 * @param {Ref} formRef - a react ref for the form
 * @param {Object} errors - an object whose keys are input names
 */
function useErrorFocus(formRef, errors) {
  useEffect(() => {
    if (!isEmpty(errors)) {
      const errorNames = Object.keys(errors);
      const inputNames = [...formRef.current.elements].map((el) => el.name);
      const firstErrorName = inputNames.find((name) => errorNames.indexOf(name) !== -1);
      const targetElement = formRef.current.elements[firstErrorName];
      if (targetElement) {
        let scrollableElement = targetElement;
        if (targetElement.length) {
          // targetElement, in some cases, is a NodeList with multiples, only one of which is visible in the DOM.
          scrollableElement = findFirstVisibleChild(targetElement);
        }
        // use this lib as polyfill for Safari iOS.
        // Focus in callback so we see the smooth scroll on other browsers (the ones that treat "focus" as an implied "scroll into view")
        scrollIntoView(scrollableElement, scrollOptions, () => scrollableElement.focus());
      }
    }
  }, [errors, formRef]);
}

export default useErrorFocus;

function findFirstVisibleChild(nodeList) {
  return [...nodeList].find((el) => el.offsetParent);
}
