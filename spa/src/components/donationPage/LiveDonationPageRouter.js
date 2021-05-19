import { useEffect, useCallback } from 'react';

// AJAX
import axios from 'ajax/axios';
import { LIVE_PAGE } from 'ajax/endpoints';

// Sentry
import * as Sentry from '@sentry/react';

// Router
import { useParams } from 'react-router-dom';

// Children
import LiveErrorFallback from 'components/donationPage/LiveErrorFallback';

function LiveDonationPageRouter() {
  const params = useParams();

  const fetchLivePageContent = useCallback(async () => {
    const { revProgramSlug, pageSlug } = params;
    const requestParams = {
      revenue_program: revProgramSlug,
      page: pageSlug
    };

    try {
      const response = await axios.get(LIVE_PAGE, { params: requestParams });
      console.log('response!', response);
    } catch (e) {}
  }, [params]);

  useEffect(() => {
    fetchLivePageContent();
  }, [params, fetchLivePageContent]);

  return (
    <Sentry.ErrorBoundary fallback={<LiveErrorFallback />}>
      <p>LiveDonationPageRouter</p>
    </Sentry.ErrorBoundary>
  );
}

export default LiveDonationPageRouter;
