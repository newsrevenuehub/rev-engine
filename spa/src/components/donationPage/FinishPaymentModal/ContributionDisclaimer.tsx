import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { CONTRIBUTION_INTERVALS, ContributionInterval } from 'constants/contributionIntervals';
import { Link, Root } from './ContributionDisclaimer.styled';

const ContributionDisclaimerPropTypes = {
  formattedAmount: PropTypes.string.isRequired,
  interval: PropTypes.string.isRequired,
  locale: PropTypes.string,
  processingDate: PropTypes.instanceOf(Date).isRequired
};

export interface ContributionDisclaimerProps extends InferProps<typeof ContributionDisclaimerPropTypes> {
  interval: ContributionInterval;
  locale?: string;
}

function ContributionDisclaimer({
  formattedAmount,
  interval,
  locale = 'en',
  processingDate
}: ContributionDisclaimerProps) {
  const formattedProcessingDate = useMemo(() => {
    switch (interval) {
      case CONTRIBUTION_INTERVALS.ONE_TIME:
        // English: Jan 1, 2023
        return Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(processingDate);
      case CONTRIBUTION_INTERVALS.MONTHLY:
        // We pass the date only to the localization string in this case. It will handle
        // translating 1 to '1st', 2 to '2nd', and so on.
        // See https://www.i18next.com/translation-function/plurals#ordinal-plurals
        return processingDate.getDate();
      case CONTRIBUTION_INTERVALS.ANNUAL:
        // English: 1/31
        return Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' }).format(processingDate);
      default:
        throw new Error(`Don't know how to format a processing date for ${interval} interval`);
    }
  }, [interval, locale, processingDate]);
  const { t } = useTranslation();

  return (
    <Root data-testid="donation-page-disclaimer">
      <p>
        <Trans
          i18nKey="donationPage.contributionDisclaimer.policyAgreement"
          components={{
            privacy: <Link href={t('common.urls.privacyPolicy')} target="_blank" />,
            terms: <Link href={t('common.urls.tsAndCs')} target="_blank" />
          }}
        />{' '}
        {interval === 'month' ? (
          <Trans
            i18nKey={`donationPage.contributionDisclaimer.authorizePayment.${interval}`}
            count={formattedProcessingDate as number}
            tOptions={{ ordinal: true }}
            values={{ amount: formattedAmount }}
          />
        ) : (
          <Trans
            i18nKey={`donationPage.contributionDisclaimer.authorizePayment.${interval}`}
            values={{ amount: formattedAmount, date: formattedProcessingDate }}
          />
        )}
      </p>
    </Root>
  );
}

export default ContributionDisclaimer;
