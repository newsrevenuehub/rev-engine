import { DonationPageContext } from '../DonationPage';
import { PayFeesWidget } from './DPayment';

const PayFeesWidgetDemo = (pageContext) => {
  return (
    <DonationPageContext.Provider value={pageContext}>
      <PayFeesWidget />
    </DonationPageContext.Provider>
  );
};

export default {
  title: 'Donation Page/PayFeesWidget',
  component: PayFeesWidgetDemo
};

export const Default = PayFeesWidgetDemo.bind({});

Default.args = {
  feeAmount: 123.45,
  frequency: 'one_time',
  page: {
    currency: {
      symbol: '🍁'
    }
  },
  setUserAgreesToPayFees: () => {},
  userAgreesToPayFees: true
};
