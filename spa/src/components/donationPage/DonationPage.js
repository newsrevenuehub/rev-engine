import { useRef, useState, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';
import * as getters from 'components/donationPage/pageGetters';

const DonationPageContext = createContext({});

function DonationPage({ page, live = false }) {
  const formRef = useRef();
  const [frequency, setFrequency] = useState('one_time');
  const [fee, setFee] = useState();
  const [payFee, setPayFee] = useState(false);
  const [amount, setAmount] = useState();

  return (
    <DonationPageContext.Provider
      value={{
        page,
        frequency,
        setFrequency,
        fee,
        payFee,
        setFee,
        setPayFee,
        formRef,
        amount,
        setAmount
      }}
    >
      <S.DonationPage data-testid="donation-page">
        {getters.getHeaderBarElement()}
        <S.PageMain>
          <S.SideOuter>
            <S.SideInner>
              {getters.getPageHeadingElement()}
              <S.DonationContent>
                {getters.getGraphicElement()}
                <form ref={formRef} data-testid-donation-page-form>
                  <S.PageElements>
                    {page?.elements.map((element) => getters.getDynamicElement(element, live))}
                  </S.PageElements>
                </form>
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
