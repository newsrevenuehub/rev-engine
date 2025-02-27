import { ComponentMeta, ComponentStory } from '@storybook/react';
import MailchimpLogo from 'assets/images/mailchimp.png';

import MailchimpModal, { MailchimpModalProps } from './MailchimpModal';

export default {
  component: MailchimpModal,
  title: 'Settings/IntegrationCard/MailchimpModal'
} as ComponentMeta<typeof MailchimpModal>;

const Template: ComponentStory<typeof MailchimpModal> = (props: MailchimpModalProps) => <MailchimpModal {...props} />;

export const FreePlan = Template.bind({});

FreePlan.args = {
  open: true,
  organizationPlan: 'FREE',
  isActive: false,
  isRequired: false,
  title: 'Mailchimp',
  image: MailchimpLogo,
  site: {
    label: 'mailchimp.com',
    url: 'https://www.mailchimp.com'
  }
};

export const FreePlanWithSelfUpgrade = Template.bind({});

FreePlanWithSelfUpgrade.args = {
  open: true,
  organizationPlan: 'FREE',
  isActive: false,
  isRequired: false,
  title: 'Mailchimp',
  image: MailchimpLogo,
  site: {
    label: 'mailchimp.com',
    url: 'https://www.mailchimp.com'
  }
};

export const PaidPlanWithMailchimpNotConnected = Template.bind({});

PaidPlanWithMailchimpNotConnected.args = {
  open: true,
  organizationPlan: 'CORE',
  isActive: false,
  isRequired: false,
  title: 'Mailchimp',
  image: MailchimpLogo,
  site: {
    label: 'mailchimp.com',
    url: 'https://www.mailchimp.com'
  }
};

export const PaidPlanWithMailchimpConnected = Template.bind({});

PaidPlanWithMailchimpConnected.args = {
  open: true,
  organizationPlan: 'PLUS',
  isActive: true,
  isRequired: false,
  title: 'Mailchimp',
  image: MailchimpLogo,
  site: {
    label: 'mailchimp.com',
    url: 'https://www.mailchimp.com'
  }
};
