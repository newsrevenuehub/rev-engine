import isEmpty from 'lodash.isempty';
import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';

const requiredContent = Object.keys(dynamicElements).filter((key) => dynamicElements[key].requireContent);
const requiredElements = Object.keys(dynamicElements).filter((key) => dynamicElements[key].required);

function validatePage(page) {
  const errors = {
    ...validateRequiredElements(page.elements)
  };
  return !isEmpty(errors) && errors;
}

function elementMissingRequirements(element) {
  if (requiredContent.includes(element.type)) {
    return !element?.content;
  }
  return false;
}

function validateRequiredElements(elements) {
  /* validateRequiredElements
   * Examines each element on a page and determines first if the element is required and then checks existing elements
   * that have `requireContent = true` to ensure that they have at least one feature set on the element.
   *
   * Elements that have `requireContent = true` should also implement `contentMissingMsg` on the element or nothing will display
   * for the user causing assured confusion.
   *
   * Currently this is a gross check and does not try to validate internal interactions of the element. It is assumed,
   * that these are handled in the ElementEditor component.
   */
  if (!elements) return;

  const elementErrors = [];
  for (let i = 0; i < requiredElements.length; i++) {
    const requiredElement = requiredElements[i];
    const is_missing = !elements.find((el) => el.type === requiredElement);
    const el_instance = elements.filter((el) => el.type === requiredElement);
    const dElement = dynamicElements[requiredElement];

    if (is_missing) {
      elementErrors.push({ element: requiredElement, message: `${dElement.displayName} is missing.` });
      continue;
    }

    if (elementMissingRequirements(el_instance[0])) {
      // TODO: Support multiple instances of a type.
      // TODO: Support multiple requirements.
      elementErrors.push({ element: requiredElement, message: `${dElement?.contentMissingMsg}` });
    }
  }
  // Only return a truthy value here if there really are errors.
  if (elementErrors.length > 0) return { elementErrors };
}

export default validatePage;
