import { useRef, useState, useEffect, useCallback, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';

import { useLocation } from 'react-router-dom';

// Util
import * as getters from 'components/donationPage/pageGetters';
import { frequencySort } from 'components/donationPage/pageContent/DFrequency';
import { getDefaultAmount } from 'components/donationPage/pageContent/DAmount';

// Deps
import queryString from 'query-string';

const SALESFORCE_CAMPAIGN_ID_QUERYPARAM = process.env.REACT_APP_SALESFORCE_CAMPAIGN_ID_QUERYPARAM || 'campaign';
const AMOUNT_QUERYPARAM = process.env.REACT_APP_AMOUNT_QUERYPARAM || 'amount';
const FREQUENCY_QUERYPARAM = process.env.REACT_APP_FREQUENCY_QUERYPARAM || 'frequency';

// Keys are the strings expected as querys params, values are our version.
const mapQSFreqToProperFreq = {
  once: 'one_time',
  monthly: 'month',
  yearly: 'year'
};

const DonationPageContext = createContext({});

function DonationPage({ page, live = false }) {
  const location = useLocation();
  const formRef = useRef();
  const [frequency, setFrequency] = useState(getInitialFrequency(page));
  const [payFee, setPayFee] = useState(false);
  const [amount, setAmount] = useState(getDefaultAmount(frequency, page));

  // overrideAmount causes only the custom amount to show (initially)
  const [overrideAmount, setOverrideAmount] = useState(false);
  const [errors, setErrors] = useState({});
  const [salesforceCampaignId, setSalesforceCampaignId] = useState();

  /**
   * handleIncomingAmountOrFrequency
   * @param {string} queryString - a query string parsed by the query-string library
   * Set frequency or amount based on incoming querystrings.
   */
  const handleIncomingAmountOrFrequency = useCallback(
    (qs) => {
      const qsAmount = qs[AMOUNT_QUERYPARAM];
      const qsFrequency = qs[FREQUENCY_QUERYPARAM];

      const mappedFrequency = mapQSFreqToProperFreq[qsFrequency];

      const amountElement = page?.elements?.find((el) => el.type === 'DAmount');
      const amounts = amountElement?.content?.options;

      // Check if the incoming frequency is a valid choice
      const frequencyElement = page?.elements?.find((el) => el.type === 'DFrequency');
      const frequencies = frequencyElement?.content?.map((f) => f.value);
      const freqIsAvailable = frequencies.includes(mappedFrequency);

      // If the provided frequency is available, or there is no qsFrequency, use one_time
      if (qsAmount && (!freqIsAvailable || !qsFrequency)) setFrequency('one_time');
      else if (qsFrequency && freqIsAvailable) setFrequency(mappedFrequency);

      const freqAmounts = amounts && amounts[mappedFrequency];
      const amountIndex = freqAmounts?.findIndex((num) => parseFloat(num) === parseFloat(qsAmount));

      if (qsAmount) setAmount(qsAmount);
      if (qsAmount && (amountIndex === undefined || amountIndex === -1)) {
        // It doesn't exist in one_time, so set override.
        setOverrideAmount(true);
      }
    },
    [page.elements]
  );

  useEffect(() => {
    const qs = queryString.parse(location.search);
    if (qs[SALESFORCE_CAMPAIGN_ID_QUERYPARAM]) setSalesforceCampaignId(qs[SALESFORCE_CAMPAIGN_ID_QUERYPARAM]);
    if (qs[AMOUNT_QUERYPARAM] || qs[FREQUENCY_QUERYPARAM]) handleIncomingAmountOrFrequency(qs);
  }, [location.search, setSalesforceCampaignId, handleIncomingAmountOrFrequency]);

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
        overrideAmount,
        setOverrideAmount,
        errors,
        setErrors,
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
    // If there's a default frequency, use it...
    const defaultFreq = frequencyElement.content.find((freq) => freq.isDefault);
    if (defaultFreq) return defaultFreq.value;

    // ...otherwise, use the "first" in the list.
    const content = frequencyElement.content || [];
    const sortedOptions = content.sort(frequencySort);
    return sortedOptions[0]?.value || '';
  }
  // Or, if for some reason non of these conditions are met, just return one_time
  return 'one_time';
}
