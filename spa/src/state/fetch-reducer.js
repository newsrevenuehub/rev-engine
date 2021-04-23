export const FETCH_START = "FETCH_START";
export const FETCH_SUCCESS = "FETCH_SUCCESS";
export const FETCH_FAILURE = "FETCH_FAILURE";

export const initialState = {
  loading: false,
  errors: [],
  data: null,
};

const fetchReducer = (state, action) => {
  switch (action.type) {
    case FETCH_START: {
      return {
        ...state,
        loading: true,
        errors: initialState.errors,
      };
    }
    case FETCH_SUCCESS: {
      return {
        ...state,
        loading: false,
        data: action.payload,
        errors: initialState.errors,
      };
    }
    case FETCH_FAILURE: {
      return {
        ...state,
        loading: false,
        errors: action.payload,
      };
    }

    default:
      return state;
  }
};

export default fetchReducer;
