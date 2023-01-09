import { ReactNodeLike } from 'prop-types';

import StripeLogo from 'assets/images/stripe.png';
import SlackLogo from 'assets/images/slack.png';
import MailchimpLogo from 'assets/images/mailchimp.png';
import SalesforceLogo from 'assets/images/salesforce.jpg';
import { HELP_URL } from 'constants/helperUrls';

export type IntegrationCardType = {
  image: string;
  title: string;
  isRequired: boolean;
  cornerMessage?: string | null;
  site: {
    label: string;
    url: string;
  };
  description: string;
  toggleLabel?: ReactNodeLike;
  toggleTooltipMessage?: string | null;
  toggleConnectedTooltipMessage?: ReactNodeLike;
  disabled: boolean;
};

const STRIPE: IntegrationCardType = {
  image: StripeLogo,
  title: 'Stripe',
  isRequired: true,
  site: {
    label: 'stripe.com',
    url: 'https://www.stripe.com'
  },
  description: 'A simple way to accept payments online.',
  disabled: false,
  toggleConnectedTooltipMessage: (
    <>
      Connected to Stripe. Contact{' '}
      <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
        Support
      </a>{' '}
      to disconnect.
    </>
  )
};

const SLACK: IntegrationCardType = {
  image: SlackLogo,
  title: 'Slack',
  isRequired: false,
  site: {
    label: 'slack.com',
    url: 'https://www.slack.com'
  },
  description:
    'Bring team communication and collaboration into one place. Get contributions notifications in real time.',
  disabled: true,
  toggleTooltipMessage: 'Coming Soon',
  toggleConnectedTooltipMessage: (
    <>
      Connected to Slack. Contact{' '}
      <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
        Support
      </a>{' '}
      to disconnect.
    </>
  )
};

const MAILCHIMP: IntegrationCardType = {
  image: MailchimpLogo,
  title: 'Mailchimp',
  isRequired: false,
  cornerMessage: 'Upgrade to Core',
  site: {
    label: 'mailchimp.com',
    url: 'https://www.mailchimp.com'
  },
  description: 'Automate your welcome series and renewal appeals with the all-in-one email platform newsrooms trust.',
  toggleTooltipMessage: 'Coming Soon',
  disabled: true,
  toggleConnectedTooltipMessage: (
    <>
      Connected to Mailchimp. Contact{' '}
      <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
        Support
      </a>{' '}
      to disconnect.
    </>
  )
};

const SALESFORCE: IntegrationCardType = {
  image: SalesforceLogo,
  title: 'Salesforce',
  isRequired: false,
  cornerMessage: 'Contact Support',
  site: {
    label: 'salesforce.com',
    url: 'https://www.salesforce.com'
  },
  description: "Manage multi-channel customer insights with the world's #1 CRM.",
  toggleLabel: (
    <>
      Contact{' '}
      <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
        Support
      </a>{' '}
      to Connect
    </>
  ),
  toggleTooltipMessage: 'Contact our Support Staff to integrate with Salesforce',
  disabled: true,
  toggleConnectedTooltipMessage: (
    <>
      Connected to Salesforce. Contact{' '}
      <a href={HELP_URL} style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
        Support
      </a>{' '}
      to disconnect.
    </>
  )
};

const INTEGRATION_TYPES = { STRIPE, SLACK, MAILCHIMP, SALESFORCE };

export default INTEGRATION_TYPES;
