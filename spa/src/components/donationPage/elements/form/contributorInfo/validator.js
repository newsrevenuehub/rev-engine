import * as Yup from 'yup';

export const MESSAGE = 'Please provide a valid email address';

const validator = Yup.string().email(MESSAGE);

export default validator;
