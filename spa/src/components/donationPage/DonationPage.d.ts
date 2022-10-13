// This is temporary while the TypeScript transition is taking place.
// Eventually, DonationPage should be migrated to TypeScript.

import { Context, Dispatch, SetStateAction } from 'react';
import { ContributionInterval } from 'constants/contributionIntervals';

/**
 * Information about a donation page. **THIS TYPE IS INCOMPLETE.**
 */
export interface DonationPage {
  currency?: {
    /**
     * What symbol should be prepended to a currency amount.
     */
    symbol?: string;
  };
}

/**
 * Info available in the donation page context. **THIS TYPE IS INCOMPLETE.**
 */
export interface UsePageProps {
  /**
   * How much payment processing fees will be for this contribution.
   */
  feeAmount: number;
  /**
   * How often the user wants to contribute.
   */
  frequency: ContributionInterval;
  /**
   * Information about the donation page itself.
   */
  page: DonationPage;
  setUserAgreesToPayFees: Dispatch<SetStateAction<boolean>>;
  /**
   * Has the user agreed to pay payment processing fees?
   */
  userAgreesToPayFees: boolean;
}

export declare const DonationPageContext: Context<UsePageProps>;

export declare function usePage(): UsePageProps;
