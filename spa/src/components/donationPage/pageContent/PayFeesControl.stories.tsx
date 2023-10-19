import { ComponentMeta, ComponentStory } from '@storybook/react';
import PayFeesControl from './PayFeesControl';

export default {
  argTypes: {
    frequency: {
      control: { type: 'select' },
      options: ['one_time', 'month', 'year']
    }
  },
  component: PayFeesControl,
  title: 'Donation Page/PayFeesControl'
} as ComponentMeta<typeof PayFeesControl>;

const Template: ComponentStory<typeof PayFeesControl> = (props) => <PayFeesControl {...props} />;

export const Default = Template.bind({});

Default.args = {
  currencyCode: 'CAD',
  currencySymbol: '🍁',
  feeAmount: 123,
  frequency: 'month',
  revenueProgramName: 'A News Organization'
};
