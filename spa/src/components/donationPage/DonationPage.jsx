import { createContext, forwardRef, useContext, useEffect, useRef, useState } from 'react';
import { useAlert } from 'react-alert';
import { useTranslation } from 'react-i18next';
import {
  AMOUNT_QUERYPARAM,
  FREQUENCY_QUERYPARAM,
  GRECAPTCHA_SITE_KEY,
  SALESFORCE_CAMPAIGN_ID_QUERYPARAM
} from 'appSettings';
import { frequencySort } from 'components/donationPage/pageContent/DFrequency';
import * as getters from 'components/donationPage/pageGetters';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { serializeData } from 'components/paymentProviders/stripe/stripeFns';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import useClearbit from 'hooks/useClearbit';
import useErrorFocus from 'hooks/useErrorFocus';
import { usePayment } from 'hooks/usePayment';
import useQueryString from 'hooks/useQueryString';
import useReCAPTCHAScript from 'hooks/useReCAPTCHAScript';
import calculateStripeFee from 'utilities/calculateStripeFee';
import * as S from './DonationPage.styled';
import DonationPageFooter from './DonationPageFooter';
import DonationPageForm from './DonationPageForm';
import DonationPageHeader from './DonationPageHeader';
import DonationPageSidebar from './DonationPageSidebar';
import FinishPaymentModal from './FinishPaymentModal/FinishPaymentModal';
import { getDefaultAmountForFreq } from './amountUtils';
import LiveErrorFallback from './live/LiveErrorFallback';
import { useAmountAuditing } from './useAmountAuditing';

export const DonationPageContext = createContext({});

class DonationPageUnrecoverableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DonationPageUnrecoverableError';
  }
}

function DonationPage({ page, live = false }, ref) {
  const { t } = useTranslation();
  const alert = useAlert();
  const formRef = useRef();
  const salesforceCampaignId = useQueryString(SALESFORCE_CAMPAIGN_ID_QUERYPARAM);
  const mailchimpCampaignId = useQueryString('mc_cid');
  const freqQs = useQueryString(FREQUENCY_QUERYPARAM);
  const amountQs = useQueryString(AMOUNT_QUERYPARAM);
  const [frequency, setFrequency] = useState();
  const [amount, setAmount] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const [userAgreesToPayFees, setUserAgreesToPayFees] = useState(() => {
    return (page?.elements?.find((el) => el.type === 'DPayment') || {})?.content?.payFeesDefault === true;
  });
  const [displayErrorFallback, setDisplayErrorFallback] = useState(false);
  const [mailingCountry, setMailingCountry] = useState();
  const { createPayment, deletePayment, isLoading: paymentIsLoading, payment } = usePayment();
  const { auditAmountChange, auditFrequencyChange, auditPayFeesChange, auditPaymentCreation } = useAmountAuditing();

  // Whenever amount, frequency, or fees changes, track it.
  useEffect(() => auditAmountChange(amount), [amount, auditAmountChange]);
  useEffect(() => auditFrequencyChange(frequency), [auditFrequencyChange, frequency]);
  useEffect(() => auditPayFeesChange(userAgreesToPayFees), [auditPayFeesChange, userAgreesToPayFees]);

  /*
  If window.grecaptcha is defined-- which should be done in useReCAPTCHAScript hook--
  listen for readiness and resolve promise with resulting reCAPTCHA token.
  @returns {Promise} - resolves to token or error
  */
  const getReCAPTCHAToken = () =>
    new Promise((resolve, reject) => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(async function () {
          try {
            const token = window.grecaptcha.execute(GRECAPTCHA_SITE_KEY, { action: 'submit' });
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        // TODO: [DEV-2372] Make Google Recaptcha integration less brittle
        reject(new Error('window.grecaptcha not defined at getReCAPTCHAToken call time'));
      }
    });

  useReCAPTCHAScript();

  // overrideAmount causes only the custom amount to show (initially)
  const [overrideAmount, setOverrideAmount] = useState(false);
  const [errors, setErrors] = useState({});

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

  // update the fee amount as amount and frequency change
  useEffect(() => {
    // when a user focuses on the custom amount field in the DAmount component,
    // the amount value is set to empty string initially. This is the only time
    // it should be able to have a non-numeric value. If there's already a feeAmount,
    // and amount changes to '', we want to update the fee amount, so we resolve to
    // 0. When the user enters a new numeric amount, fee still gets updated.
    const resolvedAmount = amount ?? 0;
    if (typeof resolvedAmount === 'number' && frequency && page?.revenue_program_is_nonprofit !== null) {
      setFeeAmount(calculateStripeFee(resolvedAmount, frequency, page.revenue_program_is_nonprofit));
    }
  }, [amount, frequency, page.revenue_program_is_nonprofit]);

  async function handleCheckoutSubmit() {
    let reCAPTCHAToken = '';

    // getReCAPTCHAToken returns rejected promise if window.grecaptcha is not
    // defined when function runs. In tests, and quite possibly in deployed
    // environments, this causes form submission to fail if grecaptcha hasn't
    // loaded. We don't want tests to fail or users to be blocked from making a
    // contribution just because this script hasn't loaded, so if error occurs,
    // we just go with default empty string value for token, and log.

    try {
      reCAPTCHAToken = await getReCAPTCHAToken();
    } catch (error) {
      console.error('No recaptcha token, defaulting to empty string');
    }

    try {
      auditPaymentCreation(amount);
      await createPayment(
        serializeData(formRef.current, {
          amount,
          frequency,
          mailingCountry,
          reCAPTCHAToken,
          pageId: page.id,
          payFee: userAgreesToPayFees,
          rpIsNonProfit: page.revenue_program_is_nonprofit,
          salesforceCampaignId,
          mailchimpCampaignId
        }),
        page
      );

      // When this succeeds, a payment will be returned by usePayment() and the
      // modal will appear, allowing the user to continue.
    } catch (error) {
      // this would happen on client side if request couldn't be made. See above.
      if (error.name === DonationPageUnrecoverableError.name) {
        console.error(error.message);
        setDisplayErrorFallback(true);
        // This would happen if the server returned validation errors on the form
      } else if (error.response?.status === 400 && error.response?.data) {
        setErrors(error.response.data);
      } else {
        // 403s happen if csrf token expired, or if user not authorized by api. We do want
        // to display fallback, but don't want to report to sentry.
        if (error.response?.status !== 403) {
          console.error('Something unexpected happened', error.name, error.message, error.response?.status);
        }
        setDisplayErrorFallback(true);
      }
    }
  }

  async function handleCompleteContributionCancel() {
    if (deletePayment) {
      try {
        await deletePayment();
      } catch (error) {
        // calling console.error will create a Sentry error.
        console.error(error);
        alert.error(t('donationPage.mainPage.cancelPaymentFailureMessage'));
      }
    }
  }

  function handleCompleteContributionError() {
    if (deletePayment) {
      deletePayment();
    }

    setDisplayErrorFallback(true);
    alert.error(t('common.error.generic'));
  }

  return (
    <DonationPageContext.Provider
      value={{
        page,
        frequency,
        setFrequency,
        userAgreesToPayFees,
        setUserAgreesToPayFees,
        formRef,
        amount,
        setAmount,
        overrideAmount,
        setOverrideAmount,
        errors,
        setErrors,
        feeAmount,
        mailingCountry,
        setMailingCountry
      }}
    >
      <S.DonationPage data-testid="donation-page" ref={ref}>
        <DonationPageHeader page={page} />
        <S.PageMain>
          <S.SideOuter>
            <S.SideInner>
              {getters.getPageHeadingElement()}
              <S.DonationContent>
                {getters.getGraphicElement()}
                {displayErrorFallback ? (
                  <LiveErrorFallback />
                ) : (
                  <DonationPageForm
                    disabled={paymentIsLoading || payment}
                    loading={paymentIsLoading}
                    onSubmit={handleCheckoutSubmit}
                    ref={formRef}
                  >
                    <S.PageElements>
                      {(!live && !page?.elements) ||
                        (page?.elements?.length === 0 && (
                          <S.NoElements>{t('donationPage.mainPage.emptyPageElements')}</S.NoElements>
                        ))}
                      {page?.elements
                        // The DPayment element in page data has some data we need to configure subsequent form
                        // user encounters after this form is submitted, so we filter out here.
                        ?.filter((element) => element.type !== 'DPayment')
                        .map((element, idx) => (
                          <GenericErrorBoundary key={idx}>
                            {getters.getDynamicElement(element, live)}
                          </GenericErrorBoundary>
                        ))}
                    </S.PageElements>
                  </DonationPageForm>
                )}
                {payment && !displayErrorFallback && (
                  <FinishPaymentModal
                    locale={page.locale}
                    onCancel={handleCompleteContributionCancel}
                    onError={handleCompleteContributionError}
                    open
                    payment={payment}
                  />
                )}
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

export default forwardRef(DonationPage);

// Keys are the strings expected as query params, values are our version.
const mapQSFreqToProperFreq = {
  once: CONTRIBUTION_INTERVALS.ONE_TIME,
  monthly: CONTRIBUTION_INTERVALS.MONTHLY,
  yearly: CONTRIBUTION_INTERVALS.ANNUAL
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
  if (!freqFromQs && amountQs) return CONTRIBUTION_INTERVALS.ONE_TIME;
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
  return CONTRIBUTION_INTERVALS.ONE_TIME;
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
