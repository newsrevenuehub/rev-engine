import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { Button, CircularProgress } from 'components/base';
import { usePortalContribution } from 'hooks/usePortalContribution';
import ContributionFetchError from '../ContributionFetchError';
import { useDetailAnchor } from './useDetailAnchor';
import BillingDetails from './BillingDetails';
import BillingHistory from './BillingHistory';
import PaymentMethod from './PaymentMethod';
import MobileHeader from './MobileHeader';
import { Root, Loading, Controls } from './ContributionDetail.styled';
import { EditOutlined } from '@material-ui/icons';

const ContributionDetailPropTypes = {
  contributionId: PropTypes.string.isRequired,
  contributorId: PropTypes.number.isRequired,
  domAnchor: PropTypes.instanceOf(HTMLElement)
};

export type ContributionDetailProps = InferProps<typeof ContributionDetailPropTypes>;

export function ContributionDetail({ domAnchor, contributionId, contributorId }: ContributionDetailProps) {
  const { contribution, isError, isLoading, refetch } = usePortalContribution(contributorId, contributionId);
  const [editable, setEditable] = useState(false);

  // We need to store the root element in state so that changes to it trigger
  // the useDetailAnchor hook. We also assign different keys to the root element
  // below so that a new element is created in the DOM when state changes occur,
  // so that the hook is triggered in this case as well.

  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  useDetailAnchor(domAnchor ?? null, rootEl);

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
    <Root key="loaded" ref={setRootEl}>
      <MobileHeader contribution={contribution} />
      <BillingDetails contribution={contribution} />
      <PaymentMethod contribution={contribution} editable={editable} />
      <BillingHistory payments={contribution.payments} />
      <Controls>
        {editable ? (
          <>
            <Button color="secondary" onClick={() => setEditable(false)}>
              Cancel Changes
            </Button>
            <Button color="primaryDark">Save</Button>
          </>
        ) : (
          <Button color="secondary" onClick={() => setEditable(true)} startIcon={<EditOutlined />}>
            Edit Payment
          </Button>
        )}
      </Controls>
    </Root>
  );
}

ContributionDetail.propTypes = ContributionDetailPropTypes;
export default ContributionDetail;
