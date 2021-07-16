import { useRef, useState, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';
import * as getters from 'components/donationPage/pageGetters';
import { frequencySort } from 'components/donationPage/pageContent/DFrequency';

const DonationPageContext = createContext({});

function DonationPage({ page, live = false }) {
  const formRef = useRef();
  const [frequency, setFrequency] = useState(getInitialFrequency(page));
  const [payFee, setPayFee] = useState(false);
  const [amount, setAmount] = useState();
  const [errors, setErrors] = useState({});

  return (
    <DonationPageContext.Provider
      value={{
        page,
        frequency,
        setFrequency,
        payFee,
        setPayFee,
        formRef,
        amount,
        setAmount,
        errors,
        setErrors
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
                <form ref={formRef} data-testid="donation-page-form">
                  <S.PageElements>
                    {(!live && !page?.elements) ||
                      (page?.elements.length === 0 && (
                        <S.NoElements>Open the edit interface to start adding content</S.NoElements>
                      ))}
                    {page?.elements?.map((element) => getters.getDynamicElement(element, live))}
                  </S.PageElements>
                </form>
              </S.DonationContent>
            </S.SideInner>
          </S.SideOuter>
          {page.donor_benefits && getters.getBenefitsElement()}
        </S.PageMain>
      </S.DonationPage>
    </DonationPageContext.Provider>
  );
}

export const usePage = () => useContext(DonationPageContext);

export default DonationPage;

function getInitialFrequency(page) {
  const frequencyElement = page?.elements?.find((el) => el.type === 'DFrequency');
  if (frequencyElement) {
    const content = frequencyElement.content || [];
    const sortedOptions = content.sort(frequencySort);
    return sortedOptions[0]?.value || '';
  }
  return 'one_time';
}
