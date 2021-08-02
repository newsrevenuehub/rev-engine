import * as dynamicLayoutElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import * as staticElements from 'components/donationPage/pageContent/staticElements';
import ElementError from 'components/donationPage/pageContent/ElementError';

export const getHeaderBarElement = () => {
  return <staticElements.SHeaderBar />;
};

export const getPageHeadingElement = () => {
  return <staticElements.SPageHeading />;
};

export const getGraphicElement = () => {
  return <staticElements.SGraphic />;
};

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

function NoComponentError({ name }) {
  return <ElementError>Missing component defintion for "{name}"</ElementError>;
}
