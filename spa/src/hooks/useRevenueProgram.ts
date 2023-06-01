import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';

import axios from 'ajax/axios';
import { RevenueProgram } from './useContributionPage';

import { REVENUE_PROGRAMS } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';
import { useCallback } from 'react';
import { useAlert } from 'react-alert';

export interface useRevenueProgramResult {
  isLoading: UseMutationResult['isLoading'];
  /**
   *  Mutation to update Revenue Program.
   */
  updateRevenueProgram: (data: Partial<RevenueProgram>) => void;
}

export default function useRevenueProgram(rpId: number): useRevenueProgramResult {
  const alert = useAlert();
  const queryClient = useQueryClient();

  const { mutateAsync: updateRevenueProgramMutation, isLoading } = useMutation(
    (data: Partial<RevenueProgram>) => {
      return axios.patch(`${REVENUE_PROGRAMS}${rpId}/`, data);
    },
    {
      // Invalidate `user` because we need to get the latest
      // values for Revenue Program in user. This forces a refetch
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] })
    }
  );

  const updateRevenueProgram = useCallback(
    async (data: Partial<RevenueProgram>) => {
      try {
        await updateRevenueProgramMutation(data);
      } catch (error) {
        console.error(error);
        alert.error(GENERIC_ERROR);
      }
    },
    [alert, updateRevenueProgramMutation]
  );

  return { updateRevenueProgram, isLoading };
}
