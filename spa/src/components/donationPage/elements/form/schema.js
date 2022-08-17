import * as Yup from 'yup';

import { default as amountValidator } from './amount/validator';
import { default as contributorInfoValidator } from './contributorInfo';

// payfees validator?
// benefits validator?

export default Yup.object({
  ...amountValidator,
  ...contributorInfoValidator
});

//
