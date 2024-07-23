import { useQuery } from '@tanstack/react-query';

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

const fakeData: ChurnResponse = {
  '2001': {
    '1': {
      churn_rate: 0.11764705882352941,
      num_active: 51,
      num_canceled: 6
    },
    '2': {
      churn_rate: 0.12307692307692308,
      num_active: 65,
      num_canceled: 8
    },
    '3': {
      churn_rate: 0.2235294117647059,
      num_active: 85,
      num_canceled: 19
    },
    '4': {
      churn_rate: 0.09345794392523364,
      num_active: 107,
      num_canceled: 10
    },
    '5': {
      churn_rate: 0.09090909090909091,
      num_active: 121,
      num_canceled: 11
    },
    '6': {
      churn_rate: 0.09696969696969697,
      num_active: 165,
      num_canceled: 16
    },
    '7': {
      churn_rate: 0.07575757575757576,
      num_active: 198,
      num_canceled: 15
    },
    '8': {
      churn_rate: 0.020833333333333332,
      num_active: 1056,
      num_canceled: 22
    },
    '9': {
      churn_rate: 0.04143646408839779,
      num_active: 1086,
      num_canceled: 45
    },
    '10': {
      churn_rate: 0.032403240324032405,
      num_active: 1111,
      num_canceled: 36
    },
    '11': {
      churn_rate: 0.023376623376623377,
      num_active: 1155,
      num_canceled: 27
    },
    '12': {
      churn_rate: 0.024493243243243243,
      num_active: 1184,
      num_canceled: 29
    }
  }
};

async function fetchChurn(rpSlug: string): Promise<ChurnResponse> {
  return Promise.resolve(fakeData);
}

export function useRevenueProgramChurn(rpSlug: string) {
  const { data: churn } = useQuery(['getChurn'], () => fetchChurn(rpSlug));

  return { churn };
}
