import { UserRole } from 'constants/authConstants';
import { EnginePlan, RevenueProgram } from './useContributionPage';

export interface Organization {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  plan: EnginePlan;
  show_connected_to_mailchimp: boolean;
  show_connected_to_salesforce: boolean;
  show_connected_to_slack: boolean;
  send_receipt_email_via_nre: boolean;
  show_connected_to_digestbuilder: boolean;
  show_connected_to_eventbrite: boolean;
  show_connected_to_google_analytics: boolean;
  show_connected_to_newspack: boolean;
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
  flags: { name: string }[];
}
