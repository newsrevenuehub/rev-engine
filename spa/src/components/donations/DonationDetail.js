import { useEffect, useState } from 'react';
import { useAlert } from 'react-alert';
import { useParams } from 'react-router-dom';

import * as S from './DonationDetail.styled';
import Spinner from 'elements/Spinner';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';

import useRequest from 'hooks/useRequest';
import { CONTRIBUTIONS } from 'ajax/endpoints';

import { GENERIC_ERROR, NO_VALUE } from 'constants/textConstants';

function DonationDetail() {
  const [isLoading, setIsLoading] = useState(false);
  const [donationData, setDonationData] = useState();

  const { contributionId } = useParams();
  const alert = useAlert();
  const requestDonationDetail = useRequest();

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

  const {
    amount,
    reason,
    interval,
    payment_provider_used: paymentProvider,
    payment_provider_customer_id: paymentProviderCustomerId,
    last_payment_date: lastPaymentDate,
    flagged_date: flaggedDate,
    status,
    contributor_email: contributorEmail
  } = donationData || {};
  return (
    <S.DonationDetail data-testid="donation-detail">
      {isLoading ? (
        <Spinner />
      ) : (
        <dl>
          <dt>Donor</dt>
          <dd data-testid="donorEmail">{contributorEmail}</dd>

          <dt>Amount</dt>
          <dd data-testid="amount">{amount ? formatCurrencyAmount(amount) : NO_VALUE}</dd>

          <dt>Payment interval</dt>
          <dd data-testid="interval">{interval}</dd>

          <dt>Last payment date</dt>
          <dd data-testid="lastPaymentDate">
            {lastPaymentDate ? formatDatetimeForDisplay(lastPaymentDate) : NO_VALUE}
          </dd>

          <dt>Flagged date</dt>
          <dd data-testid="flaggedDate">{flaggedDate ? formatDatetimeForDisplay(flaggedDate) : NO_VALUE}</dd>

          <dt>Payment provider</dt>
          <dd data-testid="paymentProvider">{paymentProvider || NO_VALUE}</dd>

          <dt>Payment Provider customer ID</dt>
          <dd data-testid="paymentProviderCustomerId">{paymentProviderCustomerId || NO_VALUE}</dd>

          <dt>Donation reason</dt>
          <dd data-testid="reason">{reason || NO_VALUE}</dd>

          <dt>Status</dt>
          <dd data-testid="status">{status}</dd>
        </dl>
      )}
    </S.DonationDetail>
  );
}

export default DonationDetail;
