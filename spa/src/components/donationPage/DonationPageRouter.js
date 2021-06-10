import { useEffect, useCallback, useReducer } from 'react';

// AJAX
import axios from 'ajax/axios';
import { LIVE_PAGE } from 'ajax/endpoints';

// Router
import { useParams } from 'react-router-dom';

// Children
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import LiveLoading from 'components/donationPage/live/LiveLoading';
import LivePage404 from 'components/donationPage/live/LivePage404';
import DonationPage from 'components/donationPage/DonationPage';

export const PAGE_FETCH_START = 'PAGE_FETCH_START';
export const PAGE_FETCH_SUCCESS = 'PAGE_FETCH_SUCCESS';
export const PAGE_FETCH_ERROR = 'PAGE_FETCH_ERROR';

const initialState = {
  loading: false,
  data: null,
  error: null
};

const livePageReducer = (state, action) => {
  switch (action.type) {
    case PAGE_FETCH_START:
      return {
        loading: true,
        data: initialState.data,
        error: initialState.error
      };
    case PAGE_FETCH_SUCCESS:
      return {
        loading: false,
        data: action.payload,
        error: initialState.error
      };
    case PAGE_FETCH_ERROR:
      return {
        loading: false,
        data: state.data,
        error: action?.payload || initialState.error
      };
    default:
      return state;
  }
};

function DonationPageRouter() {
  const [{ loading, error, data }, dispatch] = useReducer(livePageReducer, initialState);
  const params = useParams();

  const fetchLivePageContent = useCallback(async () => {
    dispatch({ type: PAGE_FETCH_START });
    const { revProgramSlug, pageSlug } = params;
    const requestParams = {
      revenue_program: revProgramSlug,
      page: pageSlug,
      live: 1
    };
    try {
      const { data } = await axios.get(LIVE_PAGE, { params: requestParams });
      dispatch({ type: PAGE_FETCH_SUCCESS, payload: data });
    } catch (e) {
      dispatch({ type: PAGE_FETCH_ERROR });
    }
  }, [params]);

  useEffect(() => {
    fetchLivePageContent();
  }, [params, fetchLivePageContent]);

  return (
    <SegregatedStyles>
      {loading ? <LiveLoading /> : error || !data ? <LivePage404 /> : <DonationPage live page={data} />}
    </SegregatedStyles>
  );
}

export default DonationPageRouter;
