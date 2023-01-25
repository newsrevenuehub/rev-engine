// This is temporary while the TypeScript transition is taking place.
// Eventually, DonationPage should be migrated to TypeScript.

import { Context, Dispatch, SetStateAction } from 'react';
import { ContributionInterval } from 'constants/contributionIntervals';

/**
 * Information about a contribution page. **THIS TYPE IS INCOMPLETE.**
 */
export interface DonationPage {
  currency?: {
    /**
     * What symbol should be prepended to a currency amount.
     */
    symbol?: string;
  };
  payment_provider: {
    stripe_account_id: string | null;
  };
  revenue_program: {
    name: string;
  };
  elements: {
    type: string;
    content?: {
      offerPayFees?: boolean;
      options?: {
        [x: string]: string[] | number[];
      };
      [x: string]: any;
    };
  }[];
}

/**
 * Info available in the contribution page context. **THIS TYPE IS INCOMPLETE.**
 */
export interface UsePageProps {
  /**
   * How much payment processing fees will be for this contribution.
   */
  feeAmount: number;
  /**
   * How much is the contribution.
   */
  amount?: number;
  setAmount: (amount?: number) => void;
  /**
   * Flag that causes only the custom amount to show (initially).
   */
  overrideAmount: boolean;
  /**
   * How often the user wants to contribute.
   */
  frequency: ContributionInterval;
  /**
   * Information about the contribution page itself.
   */
  page: DonationPage;
  setUserAgreesToPayFees: Dispatch<SetStateAction<boolean>>;
  stripeClientSecret: string;
  /**
   * Has the user agreed to pay payment processing fees?
   */
  userAgreesToPayFees: boolean;
  /**
   * Error object
   */
  errors: {
    amount?: string | string[];
    [x: string]: string | string[];
  };
}

export declare const DonationPageContext: Context<UsePageProps>;

export declare function usePage(): UsePageProps;
