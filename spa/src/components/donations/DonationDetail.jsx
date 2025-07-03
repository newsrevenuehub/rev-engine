import { useEffect, useState, useMemo } from 'react';
import { useAlert } from 'react-alert';
import { useParams } from 'react-router-dom';

import { DataGroupRoot, DataGroupHeading, DataInner, DL, Loading, ManageFlagged, Root } from './DonationDetail.styled';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';

// AJAX
import useRequest from 'hooks/useRequest';
import { CONTRIBUTIONS, PROCESS_FLAGGED, LIST_PAGES } from 'ajax/endpoints';

// Context
import { useConfirmationModalContext } from 'elements/modal/GlobalConfirmationModal';

import { GENERIC_ERROR, NO_VALUE } from 'constants/textConstants';
import Button from 'elements/buttons/Button';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import { PaymentStatus } from 'components/common/PaymentStatus';
import PageTitle from 'elements/PageTitle';
import { Block, Check } from '@material-ui/icons';
import { CircularProgress } from 'components/base';
import DashboardSection from 'components/dashboard/DashboardSection';
import ContributionDetailActions from './ContributionDetailActions';

function DonationDetail() {
  // Context
  const getUserConfirmation = useConfirmationModalContext();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [donationData, setDonationData] = useState();
  const [page, setPage] = useState([]);

  const { contributionId } = useParams();
  const alert = useAlert();
  const requestDonationDetail = useRequest();
  const requestProcessFlagged = useRequest();
  const requestGetPages = useRequest();

  const revenueProgram = useMemo(() => page?.revenue_program, [page]);

  useEffect(() => {
    if (donationData?.donation_page_id) {
      requestGetPages(
        { method: 'GET', url: `${LIST_PAGES}${donationData?.donation_page_id}/` },
        {
          onSuccess: ({ data }) => {
            setPage(data);
          },
          onFailure: () => alert.error(GENERIC_ERROR)
        }
      );
    }
  }, [alert, donationData?.donation_page_id, requestGetPages]);

  const getDonationDetail = () => {
    setIsLoading(true);
    requestDonationDetail(
      {
        method: 'GET',
        url: `${CONTRIBUTIONS}${contributionId}/`
      },
      { onSuccess: handleGetDonationSuccess, onFailure: handleGetDonationFailure }
    );
  };

  const handleGetDonationSuccess = (response) => {
    setDonationData(response.data);
    setIsLoading(false);
  };

  const handleGetDonationFailure = (e) => {
    setIsLoading(false);
    alert.error(GENERIC_ERROR, { timeout: 8000 });
  };

  useEffect(getDonationDetail, []);

  const handleAccept = () => {
    processFlagged({ reject: false });
  };

  const doReject = () => {
    processFlagged({ reject: true });
  };

  const handleProcessFlaggedSuccess = (response) => {
    const action = response.data.detail;
    alert.success(`Donation successfully ${action}`);
    setProcessing(false);
    getDonationDetail();
  };

  const handleProcessFlaggedFailure = () => {
    alert.error(GENERIC_ERROR);
    setProcessing(false);
  };

  const processFlagged = ({ reject = false }) => {
    setProcessing(true);
    requestProcessFlagged(
      {
        method: 'POST',
        url: `${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`,
        data: { reject }
      },
      {
        onSuccess: handleProcessFlaggedSuccess,
        onFailure: handleProcessFlaggedFailure
      }
    );
  };

  const handleReject = () => {
    getUserConfirmation('Are you sure you want to reject this contribution?', doReject);
  };

  const {
    amount,
    interval,
    formatted_payment_provider_used: paymentProvider,
    last_payment_date: lastPaymentDate,
    flagged_date: flaggedDate,
    status,
    contributor_email: contributorEmail,
    provider_payment_url,
    provider_subscription_url,
    provider_customer_url
  } = donationData || {};

  return (
    <>
      <ContributionDetailActions contributionId={parseInt(contributionId)} />
      <DashboardSection heading="Contribution Info">
        <Root data-testid="donation-detail" layout>
          <PageTitle
            title={`${contributionId} ${revenueProgram?.name ? `| ${revenueProgram?.name} ` : ''}| Contributions`}
          />
          {isLoading ? (
            <Loading layout>
              <CircularProgress />
            </Loading>
          ) : (
            <>
              <DL layout>
                <DataGroup heading="Contribution details">
                  <dt>Status</dt>
                  <dd data-testid="status">{status && <PaymentStatus status={status} />}</dd>

                  <dt layout>Contributor</dt>
                  <dd layout data-testid="donorEmail">
                    {contributorEmail}
                  </dd>

                  <dt>Amount</dt>
                  <dd data-testid="amount">{amount ? formatCurrencyAmount(amount) : NO_VALUE}</dd>

                  <dt>Payment interval</dt>
                  <dd data-testid="interval">{getFrequencyAdjective(interval)}</dd>

                  <dt>Last payment date</dt>
                  <dd data-testid="lastPaymentDate">
                    {lastPaymentDate ? formatDatetimeForDisplay(lastPaymentDate) : NO_VALUE}
                  </dd>
                </DataGroup>
                <DataGroup heading="Payment provider">
                  <dt>Payment provider</dt>
                  <dd data-testid="paymentProvider">{paymentProvider || NO_VALUE}</dd>
                  <ResourceLink provider={paymentProvider} resource="payment" url={provider_payment_url} />
                  <ResourceLink provider={paymentProvider} resource="subscription" url={provider_subscription_url} />
                  <ResourceLink provider={paymentProvider} resource="customer" url={provider_customer_url} />
                </DataGroup>
                {flaggedDate && (
                  <DataGroup heading="Flagged status">
                    <dt>Flagged date</dt>
                    <dd data-testid="flaggedDate">{flaggedDate ? formatDatetimeForDisplay(flaggedDate) : NO_VALUE}</dd>
                    {status === 'flagged' && (
                      <ManageFlagged>
                        <Button
                          loading={processing}
                          type="positive"
                          onClick={handleAccept}
                          data-testid="accept-flagged-button"
                        >
                          <Check /> Accept
                        </Button>
                        <Button
                          loading={processing}
                          type="caution"
                          onClick={handleReject}
                          data-testid="reject-flagged-button"
                        >
                          <Block /> Reject
                        </Button>
                      </ManageFlagged>
                    )}
                  </DataGroup>
                )}
              </DL>
            </>
          )}
        </Root>
      </DashboardSection>
    </>
  );
}

export default DonationDetail;

function DataGroup({ heading, children }) {
  return (
    <DataGroupRoot>
      <DataGroupHeading>{heading}</DataGroupHeading>
      <DataInner>{children}</DataInner>
    </DataGroupRoot>
  );
}

function ResourceLink({ provider, resource, url }) {
  return (
    <>
      <dt>
        {provider} {resource}
      </dt>
      <dd>
        {url ? (
          <a href={url} data-testid={`${resource}-resource-link`} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        ) : (
          NO_VALUE
        )}
      </dd>
    </>
  );
}
