import * as dynamicElements from 'components/donationPage/pageContent/dynamicElements';
import * as staticElements from 'components/donationPage/pageContent/staticElements';

export const getHeaderBarElement = (page) => {
  return page?.header ? <staticElements.SHeaderBar element={page.header} /> : null;
};

export const getPageTitleElement = (page) => {
  return page?.title ? <staticElements.SPageTitle element={page.title} /> : null;
};

export const getPlansElement = (page) => {
  return page?.plans.length > 0 && page.showPlans ? <staticElements.SPlans element={page.plans} /> : null;
};

export const getDynamicElement = (element, live) => {
  return getComponentForElement(element, live);
};

function getComponentForElement(element, live) {
  const El = dynamicElements[element.type];
  if (!El) {
    return live ? null : <NoComponentError name={element.type} key={element.tempId || element.id} />;
  }
  return <El layout element={element} key={element.id} />;
}

function NoComponentError({ name }) {
  return <p>Missing component defintion for "{name}"</p>;
}
