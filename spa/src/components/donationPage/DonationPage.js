import { useRef, useState, useEffect, createContext, useContext } from 'react';
import * as S from './DonationPage.styled';

// Hooks
import useClearbit from 'hooks/useClearbit';

// Utils
import * as getters from 'components/donationPage/pageGetters';
import { getDefaultAmountForFreq } from 'components/donationPage/pageContent/DAmount';
import { frequencySort } from 'components/donationPage/pageContent/DFrequency';

// Hooks
import useQueryString from 'hooks/useQueryString';
import useErrorFocus from 'hooks/useErrorFocus';

// Children
import DonationPageSidebar from 'components/donationPage/DonationPageSidebar';

// Children
import DonationPageSocialTags from 'components/donationPage/DonationPageSocialTags';
import DonationPageStaticText from 'components/donationPage/DonationPageStaticText';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';

const SALESFORCE_CAMPAIGN_ID_QUERYPARAM = process.env.REACT_APP_SALESFORCE_CAMPAIGN_ID_QUERYPARAM || 'campaign';
const FREQUENCY_QUERYPARAM = process.env.REACT_APP_FREQUENCY_QUERYPARAM || 'frequency';
const AMOUNT_QUERYPARAM = process.env.REACT_APP_AMOUNT_QUERYPARAM || 'amount';

const DonationPageContext = createContext({});

function DonationPage({ page, live = false }) {
  const formRef = useRef();

  const salesForceQS = useQueryString(SALESFORCE_CAMPAIGN_ID_QUERYPARAM);
  const freqQs = useQueryString(FREQUENCY_QUERYPARAM);
  const amountQs = useQueryString(AMOUNT_QUERYPARAM);
  const [frequency, setFrequency] = useState();
  const [amount, setAmount] = useState();
  const [payFee, setPayFee] = useState(() => getInitialPayFees(page));

  // overrideAmount causes only the custom amount to show (initially)
  const [overrideAmount, setOverrideAmount] = useState(false);
  const [errors, setErrors] = useState({});
  const [salesforceCampaignId, setSalesforceCampaignId] = useState();

  // Focus the first input on the page that has an error
  useErrorFocus(formRef, errors);

  // initialize clearbit.js
  useClearbit(live);

  useEffect(() => {
    setFrequency(getInitialFrequency(page, freqQs, amountQs));
  }, [freqQs, amountQs, page]);

  useEffect(() => {
    const freq = getInitialFrequency(page, freqQs, amountQs);
    setAmount(getInitialAmount(freq, page, amountQs, setOverrideAmount));
  }, [amountQs, setOverrideAmount, freqQs, page]);

  // Set sf_campaign_id from queryparams
  useEffect(() => {
    if (salesForceQS) setSalesforceCampaignId(salesForceQS);
  }, [salesForceQS, setSalesforceCampaignId]);

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
        <DonationPageSocialTags revenueProgram={page?.revenue_program} />
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
                      (page?.elements?.length === 0 && (
                        <S.NoElements>Open the edit interface to start adding content</S.NoElements>
                      ))}
                    {page?.elements?.map((element) => getters.getDynamicElement(element, live))}
                  </S.PageElements>
                </form>
                <DonationPageStaticText page={page} frequency={frequency} amount={amount} payFee={payFee} />
              </S.DonationContent>
            </S.SideInner>
          </S.SideOuter>
          <DonationPageSidebar sidebarContent={page?.sidebar_elements} live={live} />
        </S.PageMain>
        <DonationPageFooter page={page} />
      </S.DonationPage>
    </DonationPageContext.Provider>
  );
}

export const usePage = () => useContext(DonationPageContext);

export default DonationPage;

// Keys are the strings expected as querys params, values are our version.
const mapQSFreqToProperFreq = {
  once: 'one_time',
  monthly: 'month',
  yearly: 'year'
};

/**
 * getInitialFrequency
 * @param {object} page - page object
 * @param {string} freqQs - frequency query string
 * @param {string} amountQs - amount query string
 */
function getInitialFrequency(page, freqQs, amountQs) {
  // First, respond to qs if present.
  // If there's a freqQs, it's simple, just set frequency to that qs
  const freqFromQs = mapQSFreqToProperFreq[freqQs];
  if (freqFromQs) return freqFromQs;
  // If there's an amountQs, but no freqQs, we want to show that amount as "one-time"
  if (!freqFromQs && amountQs) return 'one_time';
  // Otherwise, if there's no freq or amount QS, set default normally, which means...
  const frequencyElement = page?.elements?.find((el) => el.type === 'DFrequency');
  if (frequencyElement?.content) {
    // If there's a default frequency, use it...
    const defaultFreq = frequencyElement.content?.find((freq) => freq.isDefault);
    if (defaultFreq) return defaultFreq.value;

    // ...otherwise, use the "first" in the list.
    const content = frequencyElement.content || [];
    const sortedOptions = content.sort(frequencySort);
    return sortedOptions[0]?.value || '';
  }
  // Or, if for some reason non of these conditions are met, just return one_time
  return 'one_time';
}

/**
 * getInitialAmount
 * @param {string} frequency - The frequency to get the default for
 * @param {object} page - page object
 * @param {string} amountQs - amount query string
 */
function getInitialAmount(frequency, page, amountQs, setOverrideAmount) {
  // If there's an amountQs, set it.
  if (amountQs) {
    const amountElement = page?.elements?.find((el) => el.type === 'DAmount');
    const amounts = (amountElement?.content?.options && amountElement.content.options[frequency]) || [];
    const amountIsPreset = amounts.map((a) => parseFloat(a)).includes(parseFloat(amountQs));
    // If amountQs isn't in this freqs amounts, set override
    if (!amountIsPreset) {
      setOverrideAmount(true);
    }
    return parseFloat(amountQs);
  } else {
    const defaultAmountForFreq = getDefaultAmountForFreq(frequency, page);
    return defaultAmountForFreq;
  }
}

function getInitialPayFees(page) {
  const paymentElement = page?.elements?.find((el) => el.type === 'DPayment');
  const payFeesDefault = paymentElement?.content?.payFeesDefault;
  // If payFeesDefault is true or false...
  if (payFeesDefault === true || payFeesDefault === false) {
    // ...initial value should be payFeesDefault...
    return payFeesDefault;
  }
  // ...else, default to false
  return false;
}
