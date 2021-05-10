export const initialState = {
  loading: false,
  away: false,
  status: null,
  errors: []
};

export const CONNECT_START = 'CONNECT_START';
export const CONNECT_PROCESSING = 'CONNECT_PROCESSING';
export const CONNECT_SUCCESS = 'CONNECT_SUCCESS';
export const CONNECT_FAILURE = 'CONNECT_FAILURE';

const connectReducer = (state, action) => {
  switch (action.type) {
    case CONNECT_START: {
      return {
        loading: true,
        away: false,
        status: null,
        errors: initialState.errors
      };
    }
    case CONNECT_PROCESSING: {
      return {
        loading: true,
        away: true,
        status: null,
        errors: initialState.errors
      };
    }
    case CONNECT_SUCCESS: {
      return {
        loading: false,
        away: false,
        status: action.status,
        errors: initialState.errors
      };
    }
    case CONNECT_FAILURE: {
      return {
        loading: false,
        away: false,
        status: action.status,
        errors: action.errors
      };
    }
    default:
      return state;
  }
};

export default connectReducer;
