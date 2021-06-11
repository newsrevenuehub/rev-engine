import { useState, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';
import * as getters from 'components/donationPage/pageGetters';

// TEMP
// import TemporaryStripeCheckoutTest from 'components/TEMP/TemporaryStripeCheckoutTest';

const DonationPageContext = createContext({});
const ElementsContext = createContext([]);

function DonationPage({ page, live = false }) {
  const [elements, setElements] = useState(page?.elements || []);

  return (
    <DonationPageContext.Provider value={{ page, live }}>
      <ElementsContext.Provider value={[elements, setElements]}>
        <S.DonationPage data-testid="donation-page">
          {getters.getHeaderBarElement()}
          <S.PageMain>
            <S.SideOuter>
              <S.SideInner>
                {getters.getPageHeadingElement()}
                <S.DonationContent>
                  {getters.getGraphicElement()}
                  <S.PageElements>{elements.map((element) => getters.getDynamicElement(element, live))}</S.PageElements>
                </S.DonationContent>
              </S.SideInner>
            </S.SideOuter>
            {page.show_benefits && getters.getBenefitsElement()}
          </S.PageMain>
        </S.DonationPage>
      </ElementsContext.Provider>
    </DonationPageContext.Provider>
  );
}

export const usePage = () => useContext(DonationPageContext);
export const useElements = () => useContext(ElementsContext);

export default DonationPage;
