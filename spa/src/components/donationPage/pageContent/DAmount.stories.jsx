import { DonationPageContext } from '../DonationPage';
import DAmount from './DAmount';

const DAmountDemo = ({ element, pageContext }) => {
  return (
    <DonationPageContext.Provider value={pageContext}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        <DAmount element={element} />
      </ul>
    </DonationPageContext.Provider>
  );
};

export default {
  title: 'Donation Page/DAmount',
  component: DAmountDemo
};

const baseArgs = {
  element: {
    content: {
      options: {
        one_time: ['1', '2']
      }
    }
  },
  pageContext: {
    amount: 1,
    errors: {},
    feeAmount: 123.45,
    frequency: 'one_time',
    page: {
      currency: {
        code: 'CAD',
        symbol: '🍁'
      },
      elements: [
        {
          type: 'DPayment',
          content: {
            offerPayFees: true
          }
        }
      ],
      revenue_program: { name: 'A News Organization' }
    },
    setAmount: () => {},
    setUserAgreesToPayFees: () => {},
    userAgreesToPayFees: true
  }
};

export const Default = DAmountDemo.bind({});

Default.args = baseArgs;

export const OddNumberOfFields = DAmountDemo.bind({});

OddNumberOfFields.args = {
  ...baseArgs,
  element: {
    content: {
      options: {
        one_time: ['1', '2', '3']
      }
    }
  }
};

export const AllowOther = DAmountDemo.bind({});

AllowOther.args = {
  ...baseArgs,
  element: {
    content: {
      allowOther: true,
      options: {
        one_time: ['1', '2']
      }
    }
  }
};

export const AllowOtherOddNumberOfFields = DAmountDemo.bind({});

AllowOtherOddNumberOfFields.args = {
  ...baseArgs,
  element: {
    content: {
      allowOther: true,
      options: {
        one_time: ['1', '2', '3']
      }
    }
  }
};
