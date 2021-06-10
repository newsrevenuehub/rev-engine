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
        <S.DonationPage layout>
          {getters.getHeaderBarElement()}
          <S.PageMain>
            <S.SideOuter>
              <S.SideInner>
                {getters.getPageHeadingElement()}
                {getters.getGraphicElement()}
                <S.PageElements>{elements.map((element) => getters.getDynamicElement(element, live))}</S.PageElements>
              </S.SideInner>
            </S.SideOuter>
            {page?.plans?.length > 0 && page.showPlans && <S.PlansSide>{getters.getPlansElement()}</S.PlansSide>}
          </S.PageMain>
        </S.DonationPage>
      </ElementsContext.Provider>
    </DonationPageContext.Provider>
  );
}

export const usePage = () => useContext(DonationPageContext);
export const useElements = () => useContext(ElementsContext);

export default DonationPage;

// <S.DonationPage data-testid="live-donation-page">
//   <h1>{page.title}</h1>
//   <p>Page name: {page.name}</p>
//   <p>Showing benefits: {page.show_benefits.toString()}</p>
//   <p>Org pk: {page.organization}</p>
//   <p>Rev program pk: {page.revenue_program}</p>
//   <div style={{ margin: '0 auto', maxWidth: '1000px', padding: '0 3rem' }}>
//     <TemporaryStripeCheckoutTest />
// </S.DonationPage>;
//   </div>
