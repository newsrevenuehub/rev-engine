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
  updateRevenueProgram: (rpId: number, data: Partial<RevenueProgram>) => void;
}

export default function useRevenueProgram(): useRevenueProgramResult {
  const alert = useAlert();
  const queryClient = useQueryClient();

  const { mutateAsync: updateRevenueProgramMutation, isLoading } = useMutation(
    ({ rpId, data }: { rpId: number; data: Partial<RevenueProgram> }) => {
      return axios.patch(`${REVENUE_PROGRAMS}${rpId}/`, data);
    },
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] })
    }
  );

  const updateRevenueProgram = useCallback(
    async (rpId: number, data: Partial<RevenueProgram>) => {
      try {
        await updateRevenueProgramMutation({ rpId, data });
      } catch (error) {
        console.error(error);
        alert.error(GENERIC_ERROR);
      }
    },
    [alert, updateRevenueProgramMutation]
  );

  return { updateRevenueProgram, isLoading };
}
