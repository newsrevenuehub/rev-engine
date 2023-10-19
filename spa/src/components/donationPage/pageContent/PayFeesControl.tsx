import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent } from 'react';
import { FormControlLabel } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { Header, ThemedCheckbox } from './PayFeesControl.styled';
import { useTranslation } from 'react-i18next';

const PayFeesControlPropTypes = {
  agreedToPayFees: PropTypes.bool.isRequired,
  currencyCode: PropTypes.string.isRequired,
  currencySymbol: PropTypes.string.isRequired,
  feeAmount: PropTypes.number.isRequired,
  frequency: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  revenueProgramName: PropTypes.string.isRequired,
  locale: PropTypes.string.isRequired
};

export interface PayFeesControlProps extends InferProps<typeof PayFeesControlPropTypes> {
  frequency: ContributionInterval;
  onChange: (event: ChangeEvent) => void;
}

export function PayFeesControl({
  agreedToPayFees,
  currencyCode,
  currencySymbol,
  feeAmount,
  frequency,
  onChange,
  revenueProgramName,
  locale
}: PayFeesControlProps) {
  const { t } = useTranslation();
  const formattedAmount = `${currencySymbol}${formatStringAmountForDisplay(feeAmount, locale)} ${currencyCode}`;

  return (
    <div data-testid="pay-fees">
      <Header>{t('donationPage.payFeesControl.agreeToPayFees')}</Header>
      <FormControlLabel
        control={<ThemedCheckbox checked={agreedToPayFees} onChange={onChange} />}
        label={t(`donationPage.payFeesControl.payFeesConsent.${frequency}`, {
          amount: formattedAmount,
          revenueProgramName
        })}
      />
    </div>
  );
}

PayFeesControl.propTypes = PayFeesControlPropTypes;
export default PayFeesControl;
