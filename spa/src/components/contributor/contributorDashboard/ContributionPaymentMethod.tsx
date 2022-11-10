import { ButtonBase } from '@material-ui/core';
import CreateOutlinedIcon from '@material-ui/icons/CreateOutlined';
import PropTypes from 'prop-types';
import visa from 'assets/icons/visa_icon.svg';
import mastercard from 'assets/icons/mastercard_icon.svg';
import amex from 'assets/icons/amex_icon.svg';
import discover from 'assets/icons/discover_icon.svg';
import { PaymentStatus } from 'constants/paymentStatus';
import { ContributorContribution } from 'hooks/useContributorContributionList';
import useModal from 'hooks/useModal';
import toTitleCase from 'utilities/toTitleCase';
import EditRecurringPaymentModal from './EditRecurringPaymentModal';
import { CardIcon, EditButton, LastFour, Root } from './ContributionPaymentMethod.styled';

const cardIcons = { amex, discover, visa, mastercard };
const disabledStatuses: PaymentStatus[] = ['canceled', 'processing'];

const ContributionPaymentMethodPropTypes = {
  contribution: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  onUpdateComplete: PropTypes.func
};

// If the component is not disabled, the onUpdateComplete prop is required.

interface DisabledContributionPaymentMethodProps {
  contribution: ContributorContribution;
  disabled: true;
}

interface EnabledContributionPaymentMethodProps {
  contribution: ContributorContribution;
  disabled?: false;
  onUpdateComplete: () => void;
}

export type ContributionPaymentMethodProps =
  | DisabledContributionPaymentMethodProps
  | EnabledContributionPaymentMethodProps;

export function ContributionPaymentMethod(props: ContributionPaymentMethodProps) {
  const { contribution, disabled: disabledByParent } = props;
  const { handleClose, handleOpen, open } = useModal();
  const disabled =
    disabledByParent ||
    !contribution.status ||
    disabledStatuses.includes(contribution.status) ||
    !contribution.is_modifiable;

  // Test IDs are for Cypress compatibility.

  return (
    <Root>
      <ButtonBase
        aria-label="Edit payment method"
        disabled={disabled}
        onClick={handleOpen}
        data-testid="payment-method"
      >
        {contribution.card_brand in cardIcons && (
          <CardIcon
            src={cardIcons[contribution.card_brand as keyof typeof cardIcons]}
            alt={toTitleCase(contribution.card_brand)}
            data-testid={`card-icon-${contribution.card_brand}`}
          />
        )}
        <LastFour>•••• {contribution.last4}</LastFour>
      </ButtonBase>
      {!disabled && (
        <>
          <EditButton disabled={disabled} onClick={handleOpen} aria-label="Edit payment method" size="small">
            <CreateOutlinedIcon />
          </EditButton>
          <EditRecurringPaymentModal
            closeModal={handleClose}
            contribution={contribution}
            isOpen={open}
            onComplete={props.onUpdateComplete}
          />
        </>
      )}
    </Root>
  );
}

ContributionPaymentMethod.propTypes = ContributionPaymentMethodPropTypes;

export default ContributionPaymentMethod;
