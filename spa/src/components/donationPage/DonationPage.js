import * as S from './DonationPage.styled';
// import useClearbit from 'hooks/useClearbit';
// import { getDefaultAmountForFreq } from 'components/donationPage/pageContent/DAmount';
import { frequencySort } from 'components/donationPage/elements/form/frequency';
// import { SALESFORCE_CAMPAIGN_ID_QUERYPARAM, FREQUENCY_QUERYPARAM, AMOUNT_QUERYPARAM } from 'settings';

import HeaderBar from './elements/headerBar/HeaderBar';
import Graphic from './elements/graphic/Graphic';
import PageHeading from './elements/pageHeading/PageHeading';

import ContributionForm from './elements/form/Form';

import DonationPageSidebar from 'components/donationPage/elements/sidebar/DonationPageSidebar';
import DonationPageFooter from 'components/donationPage/elements/footer/Footer';

// retr

function reducer(state, action) {
  switch (action.type) {
    case USER_CHOSE_FREQUENCY:
      return {
        ...state
      };
    case USER_CHOSE_AMOUNT:
      return {
        ...state
      };

    default:
      throw new Error();
  }
}

const USER_CHOSE_FREQUENCY = 'user-chose-frequency';
const USER_CHOSE_AMOUNT = 'user-chose-amount';
const [{ chosenAmount, chosenFrequency, agreePayFees }, dispatch] = useReducer(reducer, initialState);

function DonationPage({ page, liveView = false }) {
  return (
    <S.DonationPage data-testid="donation-page">
      <HeaderBar page={page} />
      <S.PageMain>
        <S.SideOuter>
          <S.SideInner>
            <PageHeading heading={page.heading} />
            <S.DonationContent>
              <Graphic graphic={page.graphic} />
              <ContributionForm isLive={liveView} page={page} />
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
    const defaultAmountForFreq = null;
    // const defaultAmountForFreq = getDefaultAmountForFreq(frequency, page);
    return defaultAmountForFreq;
  }
}
