import { useEffect, useCallback, useReducer } from 'react';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';

// Router
import { useParams } from 'react-router-dom';

// Utils
import isEmpty from 'lodash.isempty';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

// Children
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import LiveLoading from 'components/donationPage/live/LiveLoading';
import LivePage404 from 'components/donationPage/live/LivePage404';
import DonationPage from 'components/donationPage/DonationPage';

const FETCH_START = 'FETCH_START';
const FETCH_SUCCESS = 'FETCH_SUCCESS';
const FETCH_ERROR = 'FETCH_ERROR';

const initialState = {
  loading: false,
  data: {},
  errors: {}
};

const livePageReducer = (state, action) => {
  switch (action.type) {
    case FETCH_START:
      return {
        loading: true,
        data: initialState.data,
        errors: initialState.errors
      };
    case FETCH_SUCCESS:
      return {
        loading: false,
        data: action.payload,
        errors: initialState.errors
      };
    case FETCH_ERROR:
      return {
        loading: false,
        data: state.data,
        errors: action.payload
      };
    default:
      return state;
  }
};

function DonationPageRouter() {
  const [{ loading, errors, data }, dispatch] = useReducer(livePageReducer, initialState);
  const params = useParams();
  const requestFullPage = useRequest();

  const { setAnalyticsConfig } = useAnalyticsContext();

  const fetchLivePageContent = useCallback(async () => {
    dispatch({ type: FETCH_START });
    const { revProgramSlug, pageSlug } = params;
    const requestParams = {
      revenue_program: revProgramSlug,
      page: pageSlug
    };
    requestFullPage(
      {
        method: 'GET',
        url: LIVE_PAGE_DETAIL,
        params: requestParams
      },
      {
        onSuccess: ({ data }) => {
          const {
            google_analytics_v3_id: orgGaV3Id,
            google_analytics_v3_domain: orgGaV3Domain,
            google_analytics_v4_id: orgGaV4Id,
            facebook_pixel_id: orgFbPixelId
          } = data?.revenue_program;
          setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
          dispatch({ type: FETCH_SUCCESS, payload: data });
        },
        onFailure: (err) => dispatch({ type: FETCH_ERROR, payload: err })
      }
    );
  }, [params]);

  useEffect(() => {
    fetchLivePageContent();
  }, [params, fetchLivePageContent]);

  console.log('page, ', data);

  return (
    <SegregatedStyles page={data}>
      {loading ? (
        <LiveLoading />
      ) : !isEmpty(errors) || !data || !data.stripe_account_id ? (
        <LivePage404 />
      ) : (
        <DonationPage live page={data} />
      )}
    </SegregatedStyles>
  );
}

export default DonationPageRouter;
