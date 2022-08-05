import * as S from './DonationPage.styled';
import * as getters from 'components/donationPage/pageGetters';
// import useClearbit from 'hooks/useClearbit';
// import { getDefaultAmountForFreq } from 'components/donationPage/pageContent/DAmount';
// import { frequencySort } from 'components/donationPage/pageContent/DFrequency';
// import { SALESFORCE_CAMPAIGN_ID_QUERYPARAM, FREQUENCY_QUERYPARAM, AMOUNT_QUERYPARAM } from 'settings';

import LiveDonationContent from './LivePage';
import EditorDonationContent from './EditorPage';

import DonationPageSidebar from 'components/donationPage/DonationPageSidebar';
import DonationPageFooter from 'components/donationPage/DonationPageFooter';

function DonationPage({ page, liveView = false }) {
  return (
    <S.DonationPage data-testid="donation-page">
      {getters.getHeaderBarElement()}
      <S.PageMain>
        <S.SideOuter>
          <S.SideInner>
            {getters.getPageHeadingElement()}
            <S.DonationContent>
              {getters.getGraphicElement()}
              {liveView ? <LiveDonationContent /> : <EditorDonationContent />}
            </S.DonationContent>
          </S.SideInner>
        </S.SideOuter>
        <DonationPageSidebar sidebarContent={page?.sidebar_elements} live={liveView} />
      </S.PageMain>
      <DonationPageFooter page={page} />
    </S.DonationPage>
  );
}

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
export function getInitialFrequency(page, freqQs, amountQs) {
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
export function getInitialAmount(frequency, page, amountQs, setOverrideAmount) {
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
