import * as Yup from 'yup';

import { validator as amountValidator } from './amount';
import { validator as frequencyValidator } from './frequency';
import { validator as addressValidator } from './address';
import { validator as contributorInfoValidator } from './contributorInfo';
import { validator as givingReasonsValidator } from './reason';

// payfees validator?
// benefits validator?

export default Yup.object({
  ...amountValidator,
  ...frequencyValidator,
  ...addressValidator,
  ...contributorInfoValidator,
  ...givingReasonsValidator
});
