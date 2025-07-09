import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { REVENUE_PROGRAM } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { FiscalStatus } from 'constants/fiscalStatus';

/**
 * A revenue program. Organizations can have multiple revenue programs
 * associated with them.
 */
export interface RevenueProgram {
  /**
   * Point of contact for the revenue program.
   */
  contact_email: string;
  /**
   * Point of contact for the revenue program.
   */
  contact_phone: string;
  /**
   * ID of the default donation page of this revenue program, if it exists.
   */
  default_donation_page: number | null;
  /**
   * Fiscal sponsor name. Will only have a non-null value if fiscal_status is "fiscally sponsored".
   */
  fiscal_sponsor_name: string | null;
  /**
   * Fiscal status that is "nonprofit", "for-profit" or "fiscally sponsored".
   */
  fiscal_status: FiscalStatus;
  /**
   * Internal ID of the revenue program.
   */
  id: number;
  /**
   * User-visible name of the revenue program.
   */
  name: string;
  /**
   * ID of the revenue program's parent organization.
   */
  organization: number;
  /**
   * Has the revenue program been set up and verified by Stripe?
   */
  payment_provider_stripe_verified: boolean;
  /**
   * Slug for the revenue program used in URLs, in particular the subdomain of
   * contribution pages.
   */
  slug: string;
  /**
   * EIN tax ID.
   */
  tax_id: string | null;
  /**
   * Styles used in email templates.
   */
  transactional_email_style: {
    /**
     * Name of the body font. If null, a default value is used.
     */
    body_font: string | null;
    /**
     * Color for buttons. Currently spec'd as a hex triplet. If null, a default value is used.
     */
    button_color: string | null;
    /**
     * Color for the header. Currently spec'd as a hex triplet. If null, a default value is used.
     */
    header_color: string | null;
    /**
     * Use the default logo?
     */
    is_default_logo: boolean;
    /**
     * Alt text for the logo. This has a value even when the default logo is used.
     */
    logo_alt_text: string;
    /**
     * Full URL for the logo. This has a value even when the default logo is used.
     */
    logo_url: string;
  };
}

async function fetchRevenueProgram(id: number) {
  const { data } = await axios.get<RevenueProgram>(`${REVENUE_PROGRAM}${id}/`, {});

  return data;
}

async function patchRevenueProgram(id: number, body: Partial<RevenueProgram>) {
  const result = await axios.patch(`${REVENUE_PROGRAM}${id}/`, body);
  return result;
}

// This interface can be altered to include other errors that may be returned from the API.
export interface UpdateRevenueProgramErrors {
  contact_email?: string[];
  contact_phone?: string[];
}

export function useRevenueProgram(id?: number) {
  const queryClient = useQueryClient();
  const { data, isFetching } = useQuery(['revenueProgram', id], () => fetchRevenueProgram(id!), {
    enabled: !!id
  });
  const { mutateAsync: updateRevenueProgram } = useMutation(
    (body: Partial<RevenueProgram>) => patchRevenueProgram(id!, body),
    {
      onSuccess() {
        // We also need to invalidate the user query because it contains a list
        // of revenue programs the user belongs to, and we've changed the underlying data.
        queryClient.invalidateQueries(['user']);
        queryClient.invalidateQueries(['revenueProgram', id]);
      }
    }
  );

  return { revenueProgram: data, isFetching, updateRevenueProgram: id ? updateRevenueProgram : undefined };
}
