import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';
import * as staticElements from 'components/donationPage/pageContent/staticElements';

export const getHeaderBarElement = () => {
  return <staticElements.SHeaderBar />;
};

export const getPageHeadingElement = () => {
  return <staticElements.SPageHeading />;
};

export const getGraphicElement = () => {
  return <staticElements.SGraphic />;
};

export const getBenefitsElement = () => {
  return <staticElements.SBenefits />;
};

export const getDynamicElement = (element, live) => {
  return getComponentForElement(element, live);
};

function getComponentForElement(element, live) {
  const El = dynamicElements[element.type];
  if (!El) {
    return live ? null : <NoComponentError name={element.type} key={element.uuid} />;
  }
  return <El element={element} key={element.uuid} />;
}

function NoComponentError({ name }) {
  return <p>Missing component defintion for "{name}"</p>;
}
