import { PaymentMethod as StripePaymentMethod } from '@stripe/stripe-js';
import { useSnackbar } from 'notistack';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { CircularProgress } from 'components/base';
import SystemNotification from 'components/common/SystemNotification';
import { usePortalContribution } from 'hooks/usePortalContribution';
import ContributionFetchError from '../ContributionFetchError';
import { useDetailAnchor } from './useDetailAnchor';
import { BillingDetails } from './BillingDetails';
import { BillingHistory } from './BillingHistory';
import { PaymentMethod } from './PaymentMethod';
import { MobileHeader } from './MobileHeader';
import { Root, Loading } from './ContributionDetail.styled';
import { StripePaymentWrapper } from 'components/paymentProviders/stripe';

const ContributionDetailPropTypes = {
  contributionId: PropTypes.number.isRequired,
  contributorId: PropTypes.number.isRequired,
  domAnchor: PropTypes.instanceOf(HTMLElement)
};

export type ContributionDetailProps = InferProps<typeof ContributionDetailPropTypes>;

export function ContributionDetail({ domAnchor, contributionId, contributorId }: ContributionDetailProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { contribution, isError, isLoading, refetch, updateContribution } = usePortalContribution(
    contributorId,
    contributionId
  );
  const [editableSection, setEditableSection] = useState<'paymentMethod'>();

  // We need to store the root element in state so that changes to it trigger
  // the useDetailAnchor hook. We also assign different keys to the root element
  // below so that a new element is created in the DOM when state changes occur,
  // so that the hook is triggered in this case as well.

  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  useDetailAnchor(domAnchor ?? null, rootEl);

  async function handlePaymentMethodUpdate(method: StripePaymentMethod) {
    try {
      await updateContribution({ provider_payment_method_id: method.id });
      enqueueSnackbar(
        'Your billing details have been successfully updated. Changes may not be reflected in portal immediately.',
        {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Billing Updated!" type="success" />
          )
        }
      );
    } catch {
      // Do nothing-- usePortalContribution will show an error message.
    }
  }

  if (isError) {
    return (
      <Root key="error" ref={setRootEl}>
        <ContributionFetchError message="Error loading contribution detail." onRetry={() => refetch()} />
      </Root>
    );
  }

  if (isLoading || !contribution) {
    return (
      <Root key="loading" ref={setRootEl}>
        <Loading data-testid="loading">
          <CircularProgress aria-label="Loading contribution" size={48} variant="indeterminate" />
        </Loading>
      </Root>
    );
  }

  return (
    <StripePaymentWrapper stripeAccountId={contribution.stripe_account_id} stripeLocale="en">
      <Root key="loaded" ref={setRootEl}>
        <MobileHeader contribution={contribution} />
        <BillingDetails contribution={contribution} disabled={!!editableSection} />
        <PaymentMethod
          contribution={contribution}
          disabled={editableSection && editableSection !== 'paymentMethod'}
          editable={editableSection === 'paymentMethod'}
          onEdit={() => setEditableSection('paymentMethod')}
          onEditComplete={() => setEditableSection(undefined)}
          onUpdatePaymentMethod={handlePaymentMethodUpdate}
        />
        <BillingHistory disabled={!!editableSection} payments={contribution.payments} />
      </Root>
    </StripePaymentWrapper>
  );
}

ContributionDetail.propTypes = ContributionDetailPropTypes;
export default ContributionDetail;
