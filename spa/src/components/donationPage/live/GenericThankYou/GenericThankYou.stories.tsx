import { ComponentMeta, ComponentStory } from '@storybook/react';
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
  argTypes: {
    amount: {
      defaultValue: 123.45,
      type: 'number'
    },
    currencySymbol: {
      defaultValue: '$',
      type: 'string'
    },
    donationPageUrl: {
      defaultValue: 'https://newsrevenuehub.fundjournalism.org/donate/',
      type: 'string'
    },
    email: {
      defaultValue: 'contributor@fundjournalism.org',
      type: 'string'
    },
    frequency: {
      defaultValue: 'one-time',
      type: 'string'
    },
    nonprofit: {
      defaultValue: true,
      type: 'boolean'
    },
    redirect: {
      defaultValue: 'https://fundjournalism.org',
      type: 'string'
    },
    rpName: {
      defaultValue: 'Revenue Program Name',
      type: 'string'
    },
    rpUrl: {
      defaultValue: 'https://fundjournalism.org',
      type: 'string'
    }
  }
} as ComponentMeta<typeof GenericThankYouDemo>;

const Template: ComponentStory<typeof GenericThankYouDemo> = (props) => <GenericThankYouDemo {...props} />;

export const Default = Template.bind({});
