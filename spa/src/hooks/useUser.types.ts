import { FeatureFlag } from './useFeatureFlags.types';
import { UserRole } from 'constants/authConstants';

export interface Page {
  id: number;
  name: string;
  slug: string;
  revenue_program: RevenueProgram;
}

export interface RevenueProgram {
  id: string;
  name: string;
  slug: string;
  payment_provider_stripe_verified: boolean;
}

export interface Plan {
  name: string;
  label: string;
  page_limit: number;
  style_limit: number;
  custom_thank_you_page_enabled: boolean;
}
export interface Organization {
  name: string;
  slug: string;
  plan?: Plan;
  show_connected_to_mailchimp: boolean;
  show_connected_to_salesforce: boolean;
  show_connected_to_slack: boolean;
}

export interface User {
  email_verified: boolean;
  id: string;
  email: string;
  revenue_programs: RevenueProgram[];
  /**
   * The role the user has. The first value is an internal ID, the second is human-readable.
   */
  role_type: [UserRole, string];
  organizations: Organization[];
  flags: FeatureFlag[];
}
