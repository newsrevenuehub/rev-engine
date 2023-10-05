import PropTypes, { InferProps } from 'prop-types';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { CONTRIBUTION_INTERVALS, ContributionInterval } from 'constants/contributionIntervals';
import { Link, Root } from './ContributionDisclaimer.styled';

const ContributionDisclaimerPropTypes = {
  formattedAmount: PropTypes.string.isRequired,
  interval: PropTypes.string.isRequired
};

export interface ContributionDisclaimerProps extends InferProps<typeof ContributionDisclaimerPropTypes> {
  interval: ContributionInterval;
}

function ContributionDisclaimer({ formattedAmount, interval }: ContributionDisclaimerProps) {
  const { t } = useTranslation();

  const processingDate = useMemo(() => {
    switch (interval) {
      // TODO: Add locale to "format" when we have translations
      // (non-US use DD/MM/YYYY instead of MM/DD/YYYY)
      case CONTRIBUTION_INTERVALS.ONE_TIME:
        return format(new Date(), 'MMM do, y');
      case CONTRIBUTION_INTERVALS.MONTHLY:
        return format(new Date(), 'do');
      case CONTRIBUTION_INTERVALS.ANNUAL:
        return format(new Date(), 'L/d');
      default:
        throw new Error(`Don't know how to format a processing data for ${interval} interval`);
    }
  }, [interval]);

  const amountText = `${formattedAmount}${interval === CONTRIBUTION_INTERVALS.ONE_TIME ? '' : ','}`;

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
        <Trans
          i18nKey={`donationPage.contributionDisclaimer.authorizePayment.${interval}`}
          values={{ amountText, date: processingDate }}
        />
      </p>
    </Root>
  );
}

export default ContributionDisclaimer;
