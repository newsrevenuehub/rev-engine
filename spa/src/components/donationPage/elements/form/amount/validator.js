import * as Yup from 'yup';

import { INPUT_NAME, MAX_CONTRIBUTION_AMOUNT, MIN_CONTRIBUTION_AMOUNT } from './constants';

export const MIN_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG = `This field must greater than ${MAX_CONTRIBUTION_AMOUNT.toLocaleString(
  'en-US'
)}`;
export const MAX_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG = `This field can be no greater than ${MIN_CONTRIBUTION_AMOUNT.toLocaleString(
  'en-US'
)}`;
export const REQUIRED_VALIDATION_ERROR_MSG = 'This field is required';

const validator = {
  [INPUT_NAME]: Yup.number()
    .min(MIN_CONTRIBUTION_AMOUNT, MIN_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG)
    .max(MAX_CONTRIBUTION_AMOUNT, MAX_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG)
    .required(REQUIRED_VALIDATION_ERROR_MSG)
};

export default validator;
