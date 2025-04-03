import * as dynamicLayoutElements from 'components/donationPage/pageContent/dynamicElements';
import * as dynamicSidebarElements from 'components/donationPage/pageContent/dynamicSidebarElements';
import * as staticElements from 'components/donationPage/pageContent/staticElements';
import ElementError from 'components/donationPage/pageContent/ElementError';
import { useTranslation } from 'react-i18next';

export const getPageHeadingElement = () => {
  return <staticElements.SPageHeading />;
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

export function NoComponentError({ name }) {
  const { t } = useTranslation();
  return <ElementError>{t('donationPage.pageGetter.missingComponent', { name })}</ElementError>;
}
