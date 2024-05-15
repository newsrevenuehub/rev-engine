import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PATCH_REVENUE_PROGRAM } from 'ajax/endpoints';
import axios from 'ajax/portal-axios';
import { RevenueProgram } from './useContributionPage';

async function patchRevenueProgram(rpId: number, body: Partial<RevenueProgram>) {
  const result = await axios.patch(`${PATCH_REVENUE_PROGRAM}${rpId}/`, body);
  return result;
}

export function useRevenueProgram(rpId?: number) {
  const queryClient = useQueryClient();

  const { mutateAsync: updateRevenueProgram } = useMutation(
    (body: Partial<RevenueProgram>) => {
      return patchRevenueProgram(rpId!, body);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user']);
      }
    }
  );

  if (!rpId) {
    return { updateRevenueProgram: () => console.warn('No revenue program ID provided') };
  }

  return { updateRevenueProgram };
}
