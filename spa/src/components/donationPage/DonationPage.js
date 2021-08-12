import { useRef, useState, useEffect, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';

import { useLocation } from 'react-router-dom';

// Util
import * as getters from 'components/donationPage/pageGetters';
import { frequencySort } from 'components/donationPage/pageContent/DFrequency';

// Deps// Deps
import queryString from 'query-string';

const SALESFORCE_CAMPAIGN_ID_QUERYPARAM = process.env.REACT_APP_SALESFORCE_CAMPAIGN_ID_QUERYPARAM || 'campaign';

const DonationPageContext = createContext({});

function DonationPage({ page, live = false, trackDonation }) {
  const location = useLocation();
  const formRef = useRef();
  const [frequency, setFrequency] = useState(getInitialFrequency(page));
  const [payFee, setPayFee] = useState(false);
  const [amount, setAmount] = useState();
  const [errors, setErrors] = useState({});
  const [salesforceCampaignId, setSalesforceCampaignId] = useState();

  useEffect(() => {
    const qs = queryString.parse(location.search);
    if (qs[SALESFORCE_CAMPAIGN_ID_QUERYPARAM]) setSalesforceCampaignId(qs[SALESFORCE_CAMPAIGN_ID_QUERYPARAM]);
  }, [location.search, setSalesforceCampaignId]);

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
        setErrors,
        trackDonation,
        salesforceCampaignId
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
