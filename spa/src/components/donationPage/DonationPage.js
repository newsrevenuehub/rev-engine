import { useState, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';
import * as getters from 'components/donationPage/pageContent/pageGetters';

// Children
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
          <S.DonationPageContent>
            <S.DonationSection>
              {getters.getPageTitleElement()}
              <S.DonationSectionContent>
                {elements.map((element) => getters.getDynamicElement(element, live))}
              </S.DonationSectionContent>
            </S.DonationSection>
            {page?.plans.length > 0 && page.showPlans && <S.PlansSection>{getters.getPlansElement()}</S.PlansSection>}
          </S.DonationPageContent>
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
