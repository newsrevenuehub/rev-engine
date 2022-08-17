import * as Yup from 'yup';
import StripeIntegration from './StripeIntegration';
import { loadStripe } from '@stripe/stripe-js';

const Template = () => {
  const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');
  const clientSecret = 'abcde_secret_fooo';

  return (
    <form className="flex flex-col items-center">
      <StripeIntegration stripePromise={stripePromise} clientSecret={clientSecret} />
    </form>
  );
};

const args = {
  ...StripeIntegration.defaultProps,
  component: StripeIntegration
};

export default {
  title: 'StripeIntegration',
  component: StripeIntegration
};

export const Default = Template.bind({});
Default.args = {
  ...args
};
