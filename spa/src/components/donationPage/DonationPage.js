import { useState, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';
import * as getters from 'components/donationPage/pageGetters';

const DonationPageContext = createContext({});

function DonationPage({ page, live = false }) {
  const [frequency, setFrequency] = useState('one_time');
  return (
    <DonationPageContext.Provider value={{ page, frequency, setFrequency }}>
      <S.DonationPage data-testid="donation-page">
        {getters.getHeaderBarElement()}
        <S.PageMain>
          <S.SideOuter>
            <S.SideInner>
              {getters.getPageHeadingElement()}
              <S.DonationContent>
                {getters.getGraphicElement()}
                <S.PageElements>
                  {page?.elements.map((element) => getters.getDynamicElement(element, live))}
                </S.PageElements>
              </S.DonationContent>
            </S.SideInner>
          </S.SideOuter>
          {page.show_benefits && getters.getBenefitsElement()}
        </S.PageMain>
      </S.DonationPage>
    </DonationPageContext.Provider>
  );
}

export const usePage = () => useContext(DonationPageContext);

export default DonationPage;
