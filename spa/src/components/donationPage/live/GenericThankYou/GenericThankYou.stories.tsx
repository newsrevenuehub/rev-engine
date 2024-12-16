import { Meta, StoryFn } from '@storybook/react';
import GenericThankYou from './GenericThankYou';
import { MemoryRouter, Route } from 'react-router-dom';
import { AnalyticsContextProvider } from 'components/analytics/AnalyticsContext';

interface GenericThankYouDemoProps {
  amount: number;
  currencySymbol: string;
  donationPageUrl: string;
  email: string;
  frequency: string;
  nonprofit: boolean;
  redirect: string;
  rpName: string;
  rpUrl: string;
}

const GenericThankYouDemo = ({
  amount,
  currencySymbol,
  donationPageUrl,
  email,
  frequency,
  nonprofit,
  redirect,
  rpName,
  rpUrl
}: GenericThankYouDemoProps) => (
  <MemoryRouter
    initialEntries={[
      {
        pathname: '/donate/thank-you',
        state: {
          amount,
          donationPageUrl,
          email,
          frequencyText: frequency,
          page: {
            post_thank_you_redirect: redirect,
            revenue_program: { currency: { symbol: currencySymbol }, name: rpName, website_url: rpUrl },
            revenue_program_is_nonprofit: nonprofit
          }
        }
      }
    ]}
  >
    <AnalyticsContextProvider>
      <Route path="/donate/thank-you">
        <GenericThankYou />
      </Route>
    </AnalyticsContextProvider>
  </MemoryRouter>
);

export default {
  component: GenericThankYou,
  title: 'Donation Page/GenericThankYou',
  args: {
    amount: 123.45,
    currencySymbol: '$',
    donationPageUrl: 'https://newsrevenuehub.fundjournalism.org/donate/',
    email: 'contributor@fundjournalism.org',
    frequency: 'one-time',
    nonprofit: true,
    redirect: 'https://fundjournalism.org',
    rpName: 'Revenue Program Name',
    rpUrl: 'https://fundjournalism.org'
  },
  argTypes: {
    amount: {
      type: 'number'
    },
    currencySymbol: {
      type: 'string'
    },
    donationPageUrl: {
      type: 'string'
    },
    email: {
      type: 'string'
    },
    frequency: {
      type: 'string'
    },
    nonprofit: {
      type: 'boolean'
    },
    redirect: {
      type: 'string'
    },
    rpName: {
      type: 'string'
    },
    rpUrl: {
      type: 'string'
    }
  }
} as Meta<typeof GenericThankYouDemo>;

const Template: StoryFn<typeof GenericThankYouDemo> = (props) => <GenericThankYouDemo {...props} />;

export const Default = Template.bind({});
