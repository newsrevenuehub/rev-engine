import * as S from './DonationDetail.styled';
import { useParams } from 'react-router-dom';
import { formatCurrencyAmount, formatDateTime } from './utils';
import { useEffect, useState } from 'react';
import { useAlert } from 'react-alert';
import Spinner from 'elements/Spinner';

// AJAX
import useRequest from 'hooks/useRequest';

import { GENERIC_ERROR } from 'constants/textConstants';

import { DONATIONS } from 'ajax/endpoints';

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
        url: `${DONATIONS}${contributionId}/`
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
    bad_actor_score: badActorScore,
    flagged_date: flaggedDate,
    status,
    contributor: contributorId,
    contributor_email: contributorEmail,
    donation_page: donationPage
  } = donationData || {};

  return (
    <S.DonationDetail>
      {isLoading ? (
        <Spinner />
      ) : (
        <dl>
          <dt>Donor</dt>
          <dd>
            <a href="">{contributorEmail}</a>
          </dd>

          <dt>Amount</dt>
          <dd>{formatCurrencyAmount(amount)}</dd>

          <dt>Payment interval</dt>
          <dd>{interval}</dd>

          <dt>Last payment date</dt>
          <dd>{lastPaymentDate ? formatDateTime(lastPaymentDate) : 'noDataString'}</dd>

          <dt>Flagged date</dt>
          <dd>{flaggedDate ? formatDateTime(flaggedDate) : 'noDataString'}</dd>

          <dt>Payment provider</dt>
          <dd>{paymentProvider || 'noDataString'}</dd>

          <dt>Payment Provider customer ID</dt>
          <dd>{paymentProviderCustomerId || 'noDataString'}</dd>

          <dt>Donation reason</dt>
          <dd>{reason || 'noDataString'}</dd>

          <dt>Status</dt>
          <dd>{status}</dd>
        </dl>
      )}
    </S.DonationDetail>
  );
}

export default DonationDetail;
