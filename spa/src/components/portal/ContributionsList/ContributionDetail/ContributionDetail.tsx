import { PaymentMethod as StripePaymentMethod } from '@stripe/stripe-js';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { CircularProgress } from 'components/base';
import { StripePaymentWrapper } from 'components/paymentProviders/stripe';
import { usePortalContribution } from 'hooks/usePortalContribution';
import ContributionFetchError from '../ContributionFetchError';
import { useDetailAnchor } from './useDetailAnchor';
import Actions from './Actions/Actions';
import { BillingDetails } from './BillingDetails';
import { BillingHistory } from './BillingHistory';
import { PaymentMethod } from './PaymentMethod';
import { MobileHeader } from './MobileHeader';
import { Root, Loading } from './ContributionDetail.styled';
import Banner from './Banner/Banner';

const ContributionDetailPropTypes = {
  contributionId: PropTypes.number.isRequired,
  contributorId: PropTypes.number.isRequired,
  domAnchor: PropTypes.instanceOf(HTMLElement)
};

export type ContributionDetailProps = InferProps<typeof ContributionDetailPropTypes>;

export function ContributionDetail({ domAnchor, contributionId, contributorId }: ContributionDetailProps) {
  const { cancelContribution, contribution, isError, isLoading, refetch, updateContribution } = usePortalContribution(
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

  function handlePaymentMethodUpdate(method: StripePaymentMethod) {
    updateContribution({ provider_payment_method_id: method.id }, 'paymentMethod');
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
      <Root data-testid="contribution-detail" key="loaded" ref={setRootEl}>
        <MobileHeader contribution={contribution} />
        <Banner contribution={contribution} />
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
        <Actions contribution={contribution} onCancelContribution={cancelContribution} />
      </Root>
    </StripePaymentWrapper>
  );
}

ContributionDetail.propTypes = ContributionDetailPropTypes;
export default ContributionDetail;
