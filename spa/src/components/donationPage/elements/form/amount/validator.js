import * as Yup from 'yup';

import { MAX_CONTRIBUTION_AMOUNT, MIN_CONTRIBUTION_AMOUNT } from './constants';

export const MIN_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG = `This value must be at least ${MIN_CONTRIBUTION_AMOUNT.toLocaleString(
  'en-US'
)}`;
export const MAX_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG = `This field can be no greater than ${MAX_CONTRIBUTION_AMOUNT.toLocaleString(
  'en-US'
)}`;
export const REQUIRED_VALIDATION_ERROR_MSG = 'This field is required';
export const MUST_BE_NUMBER = 'This must be a numeric amount';

const validator = Yup.number(MUST_BE_NUMBER)
  .min(MIN_CONTRIBUTION_AMOUNT, MIN_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG)
  .max(MAX_CONTRIBUTION_AMOUNT, MAX_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG)
  .required(REQUIRED_VALIDATION_ERROR_MSG);

export default validator;
