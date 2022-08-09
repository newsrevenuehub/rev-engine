import * as dynamicLayoutElements from 'components/donationPage/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/dynamicSidebarElements';
import ElementError from 'components/donationPage/form/fieldsets/ElementError';

export const getDynamicElement = (element, live) => {
  return getComponentForElement(element, live);
};

function getComponentForElement(element, live) {
  const dynamicElements = { ...dynamicLayoutElements, ...dynamicSidebarElements };
  const El = dynamicElements[element.type];
  if (!El) {
    return live ? null : <NoComponentError name={element.type} key={element.uuid} />;
  }
  return <El element={element} key={element.uuid} live={live} />;
}

export function NoComponentError({ name }) {
  return <ElementError>Missing component defintion for "{name}"</ElementError>;
}
