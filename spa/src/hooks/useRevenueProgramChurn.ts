import { useQuery } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { CONTRIBUTIONS_CHURN } from 'ajax/endpoints';

/**
 * Record keys here are year, then month (1-12).
 */
export type ChurnResponse = Record<
  string,
  Record<
    string,
    {
      /**
       * Churn rate as a percentage 0-10.
       */
      churn_rate: number;
      /**
       * Total number of active recurring contributions during this month.
       */
      num_active: number;
      /**
       * Total number of cancelled recurring contributions during this month.
       */
      num_canceled: number;
    }
  >
>;

async function fetchChurn(rpSlug: string): Promise<ChurnResponse> {
  try {
    const { data } = await axios.get(CONTRIBUTIONS_CHURN);

    return data;
  } catch (error) {
    // Log it for Sentry and rethrow, which should cause the generic error
    // message to appear.
    console.error(error);
    throw error;
  }
}

export function useRevenueProgramChurn(rpSlug: string) {
  const { data: churn } = useQuery(['getChurn'], () => fetchChurn(rpSlug));

  return { churn };
}
