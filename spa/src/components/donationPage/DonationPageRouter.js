import { useEffect, useCallback, useReducer } from 'react';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIVE_PAGE_DETAIL, ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';

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

const PAGE = 'page';
const STRIPE_ACCOUNT_ID = 'stripeAccountId';

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
        data: { ...state.data, ...action.payload },
        errors: initialState.errors
      };
    case FETCH_ERROR:
      return {
        loading: false,
        data: state.data,
        errors: { ...state.errors, ...action.payload }
      };
    default:
      return state;
  }
};

function DonationPageRouter() {
  const [{ loading, errors, data }, dispatch] = useReducer(livePageReducer, initialState);
  const params = useParams();
  const requestFullPage = useRequest();
  const requestOrgStripeAccountId = useRequest();

  const fetchOrgStripeAccountId = useCallback(async () => {
    dispatch({ type: FETCH_START });
    const requestParams = { revenue_program_slug: params.revProgramSlug };
    requestOrgStripeAccountId(
      { method: 'GET', url: ORG_STRIPE_ACCOUNT_ID, params: requestParams },
      {
        onSuccess: ({ data: responseData }) => {
          const stripeAccountId = responseData.stripe_account_id;
          dispatch({ type: FETCH_SUCCESS, payload: { [STRIPE_ACCOUNT_ID]: stripeAccountId } });
        },
        onFailure: (e) => dispatch({ type: FETCH_ERROR, payload: { [STRIPE_ACCOUNT_ID]: e } })
      }
    );
  }, [params.revProgramSlug]);

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
          dispatch({ type: FETCH_SUCCESS, payload: { [PAGE]: data } });
        },
        onFailure: (e) => dispatch({ type: FETCH_ERROR, payload: { [PAGE]: e } })
      }
    );
  }, [params]);

  useEffect(() => {
    fetchLivePageContent();
  }, [params, fetchLivePageContent]);

  useEffect(() => {
    fetchOrgStripeAccountId();
  }, [params, fetchOrgStripeAccountId]);

  return (
    <SegregatedStyles page={data[PAGE]}>
      {loading ? (
        <LiveLoading />
      ) : !isEmpty(errors) || !data[PAGE] || !data[STRIPE_ACCOUNT_ID] ? (
        <LivePage404 />
      ) : (
        <DonationPage live page={data[PAGE]} stripeAccountId={data[STRIPE_ACCOUNT_ID]} />
      )}
    </SegregatedStyles>
  );
}

export default DonationPageRouter;
