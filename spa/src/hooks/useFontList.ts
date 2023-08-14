import { useQueryClient, useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';

import { LIST_FONTS } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { GENERIC_ERROR } from 'constants/textConstants';
import { SIGN_IN } from 'routes';

async function fetchFonts() {
  const { data } = await axios.get(LIST_FONTS);

  return data;
}

type Font = {
  accessor: string;
  font_name: string;
  id: number;
  name: string;
  source: 'google' | 'typekit';
};

export interface UseFontListResult {
  isLoading: UseQueryResult['isLoading'];
  isError: UseQueryResult['isError'];
  fonts: Font[];
  refetch: () => void;
}

function useFontList(): UseFontListResult {
  const alert = useAlert();
  const history = useHistory();
  const queryClient = useQueryClient();
  const {
    data: fonts,
    isLoading,
    isError
  } = useQuery(['fonts'], fetchFonts, {
    initialData: [],
    onError: (err: Error) => {
      if (err?.name === 'AuthenticationError') {
        history.push(SIGN_IN);
      } else {
        console.error(err);
        alert.error(GENERIC_ERROR);
      }
    }
  });
  return {
    fonts,
    isLoading,
    isError,
    refetch: () => {
      queryClient.invalidateQueries(['fonts']);
    }
  };
}

export default useFontList;
