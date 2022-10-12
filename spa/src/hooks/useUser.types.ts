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
  role_type: UserRole;
  organization: Organization;
  flags: FeatureFlag[];
}
