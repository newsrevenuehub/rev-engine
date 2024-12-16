import { Meta, StoryFn } from '@storybook/react';
import { DonationPageContext } from '../DonationPage';
import DSwag from './DSwag';

export default {
  component: DSwag,
  title: 'Donation Page/DSwag'
} as Meta<typeof DSwag>;

const Template: StoryFn<typeof DSwag> = (props) => (
  <DonationPageContext.Provider
    value={
      {
        amount: 100,
        frequency: 'one_time',
        page: {
          currency: {
            code: 'USD',
            symbol: '$'
          }
        }
      } as any
    }
  >
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      <DSwag {...props} />
    </ul>
  </DonationPageContext.Provider>
);

export const Default = Template.bind({});
Default.args = {
  element: {
    content: {
      swags: [
        {
          swagName: 'T-Shirt Size',
          swagOptions: ['Small', 'Medium', 'Large']
        }
      ],
      swagThreshold: 100
    },
    requiredFields: [],
    type: 'DSwag',
    uuid: 'mock-uuid'
  }
};

export const BelowThreshold = Template.bind({});
BelowThreshold.args = {
  element: {
    content: {
      swags: [
        {
          swagName: 'T-Shirt Size',
          swagOptions: ['Small', 'Medium', 'Large']
        }
      ],
      swagThreshold: 101
    },
    requiredFields: [],
    type: 'DSwag',
    uuid: 'mock-uuid'
  }
};
