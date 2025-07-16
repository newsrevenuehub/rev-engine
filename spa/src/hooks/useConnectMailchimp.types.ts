import { UseQueryResult } from '@tanstack/react-query';
import { Dispatch, SetStateAction } from 'react';
import { EnginePlan } from './useContributionPage';
import { RevenueProgramForUser } from './useUser.types';

/**
 * A single Mailchimp audience.
 */
export interface MailchimpAudience {
  /**
   * Internal ID.
   */
  id: string;
  /**
   * User-visible name.
   */
  name: string;
}

export interface RevenueProgramMailchimpStatus {
  /**
   * ID of the revenue program.
   */
  id: string;

  /**
   * Name of the revenue program.
   */
  name: string;

  /**
   * Slug of the revenue program.
   */
  slug: string;

  /**
   * Is the revenue program currently connected to Mailchimp?
   */
  mailchimp_integration_connected: boolean;

  /**
   * Audience that will be synced with our contributor data. Only set when
   * mailchimp_integration_connected is true.
   */
  chosen_mailchimp_email_list?: MailchimpAudience;

  /**
   * All audiences visible to us through Mailchimp's API.
   */
  available_mailchimp_email_lists?: MailchimpAudience[];

  /**
   * ID of the audience that will be synced with our contributor data. This
   * should be identical to chosen_mailchimp_email_list.id, but is a separate property
   * so we can PATCH it.
   */
  mailchimp_list_id?: MailchimpAudience['id'];

  // TODO these are other fields that might be returned to us. But we don't need
  // them now.
  //
  // - RP mailchimp server prefix -- string
  // - RP mailchimp store -- serialized rep of the store if any as returned by
  //   MC API
  // - RP contributor segment -- serialized rep of the contrib segment if any as
  //   returned by MC api
  // - RP recurring segment -- serialized rep of the recurring segment if any as
  //   returned by MC api
  // - RP contributor product -- serialized rep of the contrib product if any as
  //   returned by MC api
  // - RP recurring product -- serialized rep of the recurring product if any as
  //   returned by MC API
}

/**
 * Result of calling useConnectMailchimp().
 */
export interface UseConnectMailchimpResult {
  /**
   * All audiences visible to us via Mailchimp's API. This is undefined when
   * Mailchimp isn't been connected.
   */
  audiences?: MailchimpAudience[];
  /**
   * Has Mailchimp been connected?
   */
  connectedToMailchimp: boolean;
  /**
   * User has Mailchimp feature flag enabled?
   */
  hasMailchimpAccess: boolean;
  isError: UseQueryResult['isError'];
  isLoading: UseQueryResult['isLoading'];
  /**
   * User's organization plan.
   */
  organizationPlan?: EnginePlan['name'];
  /**
   * Current Revenue Program being connected to Mailchimp.
   */
  revenueProgram?: RevenueProgramForUser;
  /**
   * Selects an audience to be synced with our contributor data. Only defined if
   * Mailchimp is connected.
   */
  selectAudience?: (id: MailchimpAudience['id']) => Promise<void>;
  /**
   * AudienceId that will be synced with our contributor data.
   */
  selectedAudienceId?: string;
  /**
   * Sends the user to Mailchimp to continue setup.
   */
  sendUserToMailchimp?: () => void;
  /**
   * Changes how quickly we refetch data from the API.
   */
  setRefetchInterval: Dispatch<SetStateAction<false | number>>;
}
