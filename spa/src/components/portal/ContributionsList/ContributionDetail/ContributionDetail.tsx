import { PaymentMethod as StripePaymentMethod } from '@stripe/stripe-js';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { StripePaymentWrapper } from 'components/paymentProviders/stripe';
import { usePortalContribution } from 'hooks/usePortalContribution';
import ContributionFetchError from '../ContributionFetchError';
import { useDetailAnchor } from './useDetailAnchor';
import { Actions } from './Actions';
import { Banner } from './Banner';
import { BillingDetails } from './BillingDetails';
import { BillingHistory } from './BillingHistory';
import { PaymentMethod } from './PaymentMethod';
import { MobileBackButton } from './MobileBackButton';
import { MobileHeader } from './MobileHeader';
import { Root, TopMatter, Content } from './ContributionDetail.styled';
import { LoadingSkeleton } from './LoadingSkeleton';
import usePortal from 'hooks/usePortal';
import { PLAN_NAMES } from 'constants/orgPlanConstants';

const ContributionDetailPropTypes = {
  contributionId: PropTypes.number.isRequired,
  contributorId: PropTypes.number.isRequired,
  domAnchor: PropTypes.instanceOf(HTMLElement)
};

export type ContributionDetailProps = InferProps<typeof ContributionDetailPropTypes>;

export function ContributionDetail({ domAnchor, contributionId, contributorId }: ContributionDetailProps) {
  const { page } = usePortal();
  const { cancelContribution, contribution, isError, isLoading, refetch, updateContribution, sendEmailReceipt } =
    usePortalContribution(contributorId, contributionId);
  const [editableSection, setEditableSection] = useState<'paymentMethod' | 'billingDetails'>();

  // We need to store the root element in state so that changes to it trigger
  // the useDetailAnchor hook. We also assign different keys to the root element
  // below so that a new element is created in the DOM when state changes occur,
  // so that the hook is triggered in this case as well.

  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  useDetailAnchor(domAnchor ?? null, rootEl);

  function handlePaymentMethodUpdate(method: StripePaymentMethod) {
    updateContribution({ provider_payment_method_id: method.id }, 'paymentMethod');
  }

  function handleBillingDetailsUpdate(amount: number) {
    updateContribution({ amount }, 'billingDetails');
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
        <TopMatter>
          <MobileBackButton />
          <LoadingSkeleton />
        </TopMatter>
      </Root>
    );
  }

  return (
    <StripePaymentWrapper stripeAccountId={contribution.stripe_account_id} stripeLocale="en">
      <Root data-testid="contribution-detail" key="loaded" ref={setRootEl}>
        <TopMatter>
          <MobileBackButton />
          <Banner contribution={contribution} />
          <MobileHeader contribution={contribution} />
        </TopMatter>
        <Content>
          <BillingDetails
            contribution={contribution}
            disabled={!!editableSection && editableSection !== 'billingDetails'}
            enableEditMode={
              contribution.is_modifiable && page?.revenue_program?.organization?.plan?.name === PLAN_NAMES.PLUS
            }
            editable={editableSection === 'billingDetails' && contribution.is_modifiable}
            onEdit={() => setEditableSection('billingDetails')}
            onEditComplete={() => setEditableSection(undefined)}
            onUpdateBillingDetails={handleBillingDetailsUpdate}
          />
          <PaymentMethod
            contribution={contribution}
            disabled={editableSection && editableSection !== 'paymentMethod'}
            editable={editableSection === 'paymentMethod' && contribution.is_modifiable}
            onEdit={() => setEditableSection('paymentMethod')}
            onEditComplete={() => setEditableSection(undefined)}
            onUpdatePaymentMethod={handlePaymentMethodUpdate}
          />
          <BillingHistory
            disabled={!!editableSection}
            payments={contribution.payments}
            onSendEmailReceipt={sendEmailReceipt}
          />
          <Actions contribution={contribution} onCancelContribution={cancelContribution} />
        </Content>
      </Root>
    </StripePaymentWrapper>
  );
}

ContributionDetail.propTypes = ContributionDetailPropTypes;
export default ContributionDetail;
