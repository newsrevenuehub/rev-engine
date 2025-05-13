import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import axios from 'ajax/axios';
import { EMAIL_CUSTOMIZATIONS, getEmailCustomizationEndpoint } from 'ajax/endpoints';

export interface EmailCustomization {
  /**
   * ID of the customization.
   */
  id: number;
  /**
   * ID of the revenue program it belongs to.
   */
  revenue_program: number;
  /**
   * Type of email that the customization applies to.
   */
  email_type: 'contribution_receipt';
  /**
   * Part of the email that the customization applies to.
   */
  email_block: 'message';
  /**
   * HTML content of the customization.
   */
  content_html: string;
  /**
   * Plain-text equiivalent of content_html. This can't be updated directly in the API.
   */
  content_plain_text: string;
}

/**
 * A lookup of customizations keyed block -> data.
 */
export type EmailCustomizations = Partial<Record<EmailCustomization['email_block'], EmailCustomization>>;

/**
 * A set of changes to email customizations, keyed block -> content_html. These
 * changes can't span multiple email types.
 */
export type EmailCustomizationChanges = Partial<Record<EmailCustomization['email_block'], string>>;

export interface UseEmailCustomizationsResult {
  /**
   * Existing customizations.
   */
  customizations?: EmailCustomizations;
  /**
   * Did an error occur loading customizations?
   */
  isError: boolean;
  /**
   * Are customizations loading?
   */
  isLoading: boolean;
  /**
   * Update several customizations for the email type set in the original useEmailCustomizations() call.
   * @param update email blocks to update
   * @param revenueProgramId revenue program these customizations belong to
   * @returns true only if all changes succeed
   */
  upsertCustomizations?: (update: EmailCustomizationChanges, revenueProgramId: number) => Promise<boolean>;
}

async function fetchEmailCustomizations() {
  const { data } = await axios.get<EmailCustomization[]>(EMAIL_CUSTOMIZATIONS);

  return data;
}

export function useEmailCustomizations(emailType: EmailCustomization['email_type']) {
  const { data, isError, isLoading } = useQuery(['emailCustomizations'], fetchEmailCustomizations);
  const queryClient = useQueryClient();
  const customizations: EmailCustomizations | undefined = useMemo(() => {
    if (!data) {
      return undefined;
    }

    return data.reduce<EmailCustomizations>((result, current) => {
      if (current.email_type !== emailType) {
        return result;
      }

      return { ...result, [current.email_block]: current };
    }, {});
  }, [data, emailType]);
  const { mutateAsync: createCustomization } = useMutation(
    (data: Omit<EmailCustomization, 'content_plain_text' | 'id'>) => axios.post(EMAIL_CUSTOMIZATIONS, data),
    {
      onSuccess() {
        queryClient.invalidateQueries(['emailCustomizations']);
      }
    }
  );
  const { mutateAsync: updateCustomization } = useMutation(
    (update: Omit<EmailCustomization, 'content_plain_text'>) =>
      axios.patch(getEmailCustomizationEndpoint(update.id), update),
    {
      onSuccess() {
        queryClient.invalidateQueries(['emailCustomizations']);
      }
    }
  );
  const upsertCustomizations: UseEmailCustomizationsResult['upsertCustomizations'] = async (
    update,
    revenueProgramId
  ) => {
    // We need to either create or update existing customizations depending on
    // whether the customizations have been previously saved to the backend.
    // We compare the update to the fetched customizations to figure out which to do.

    if (!customizations) {
      // Should never happen.
      throw new Error('customizations is undefined');
    }

    const requests = [];

    for (const emailBlock in update) {
      const narrowedBlock = emailBlock as EmailCustomization['email_block'];

      if (customizations[narrowedBlock]) {
        requests.push(
          updateCustomization({
            content_html: update[narrowedBlock]!,
            email_block: narrowedBlock,
            email_type: emailType,
            id: customizations[narrowedBlock].id,
            revenue_program: customizations[narrowedBlock].revenue_program
          })
        );
      } else {
        requests.push(
          createCustomization({
            content_html: update[narrowedBlock]!,
            email_block: narrowedBlock,
            email_type: emailType,
            revenue_program: revenueProgramId
          })
        );
      }
    }

    return (await Promise.allSettled(requests)).every(({ status }) => status === 'fulfilled');
  };

  const result: UseEmailCustomizationsResult = {
    customizations,
    isError,
    isLoading
  };

  if (customizations) {
    result.upsertCustomizations = upsertCustomizations;
  }

  return result;
}
