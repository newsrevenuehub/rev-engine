import { FeatureFlag } from './useFeatureFlags.types';
import { UserRole } from 'constants/authConstants';

interface RevenueProgram {
  id: string;
  name: string;
  payment_provider_stripe_verified: boolean;
}

interface Organization {
  name: string;
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
  organization: Organization;
  flags: FeatureFlag[];
}
