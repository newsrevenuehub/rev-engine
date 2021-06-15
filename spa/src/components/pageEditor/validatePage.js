import isEmpty from 'lodash.isempty';
import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';

function validatePage(page) {
  const errors = {
    ...validateRequiredElements(page.elements)
  };
  return !isEmpty(errors) && errors;
}

function validateRequiredElements(elements = []) {
  const requiredElements = Object.keys(dynamicElements).filter((key) => dynamicElements[key].required);
  const errors = {};
  for (let i = 0; i < requiredElements.length; i++) {
    const requiredElement = requiredElements[i];
    if (!elements.find((el) => el.type === requiredElement)) {
      errors.missing = errors.missing || [];
      errors.missing.push(requiredElement);
    }
  }
  return errors;
}

export default validatePage;
