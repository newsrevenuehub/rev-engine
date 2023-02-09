import { useQueryClient, useQuery, UseQueryResult } from '@tanstack/react-query';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';

import { LIST_STYLES } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { GENERIC_ERROR } from 'constants/textConstants';
import { SIGN_IN } from 'routes';

async function fetchStyles() {
  const { data } = await axios.get(LIST_STYLES);
  return data;
}

type StyleStyles = string | { [property: string]: StyleStyles } | StyleStyles[];

export interface Style {
  id: number;
  created: string;
  modified: string;
  name: string;
  styles: StyleStyles;
}

export interface UseStyleListResult {
  isLoading: UseQueryResult['isLoading'];
  isError: UseQueryResult['isError'];
  styles: Style[];
  refetch: Function;
}

function useStyleList(): UseStyleListResult {
  const alert = useAlert();
  const history = useHistory();
  const queryClient = useQueryClient();
  const {
    data: styles,
    isLoading,
    isError
  } = useQuery(['styles'], fetchStyles, {
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
    styles,
    isLoading,
    isError,
    refetch: () => {
      queryClient.invalidateQueries(['styles']);
    }
  };
}

export default useStyleList;
