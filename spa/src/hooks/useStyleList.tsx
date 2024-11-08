import { useQueryClient, useQuery, UseQueryResult, useMutation } from '@tanstack/react-query';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';

import { LIST_STYLES } from 'ajax/endpoints';
import axios from 'ajax/axios';
import { GENERIC_ERROR } from 'constants/textConstants';
import { SIGN_IN } from 'routes';
import { useSnackbar } from 'notistack';
import SystemNotification from 'components/common/SystemNotification';
import { ContributionPage } from './useContributionPage';
import { AxiosError, AxiosResponse } from 'axios';

async function fetchStyles() {
  const { data } = await axios.get(LIST_STYLES);
  return data;
}

type StyleColors = Record<string, string>;
type StyleFonts = Record<
  string,
  { accessor: string; font_name: string; id: number; name: string; source: 'google' | 'typekit' }
>;

export interface Style {
  id: number;
  colors: StyleColors;
  created: string;
  font: StyleFonts;
  modified: string;
  name: string;
  used_live: boolean;
  radii: string[];
  fontSizes: string[];
}

export interface UseStyleListResult {
  isLoading: UseQueryResult['isLoading'];
  isError: UseQueryResult['isError'];
  styles: Style[];
  refetch: () => void;
  deleteStyle: (styles: Partial<Style>) => Promise<AxiosResponse>;
  updateStyle: (styles: Partial<Style>, page: ContributionPage) => Promise<AxiosResponse<Style>>;
  createStyle: (styles: Partial<Style>, page: ContributionPage) => Promise<AxiosResponse<Style>>;
}

function useStyleList(): UseStyleListResult {
  const alert = useAlert();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const {
    data: styles,
    isLoading,
    isError
  } = useQuery(['styles'], fetchStyles, {
    initialData: [],
    onError: (err: AxiosError) => {
      if (err?.name === 'AuthenticationError') {
        history.push(SIGN_IN);
      } else {
        console.error(err);
        alert.error(GENERIC_ERROR);
      }
    }
  });

  const onSaveStylesError = (error: AxiosError) => {
    console.error(error);
    enqueueSnackbar('Style changes were not saved. Please wait and try again or changes will be lost.', {
      persist: true,
      content: (key: string, message: string) => (
        <SystemNotification id={key} message={message} header="Style Not Saved!" type="error" />
      )
    });
  };

  const updateStyleMutation = useMutation(
    ({ styles, page }: { styles: Partial<Style>; page: ContributionPage }) => {
      if (!styles || !styles.id) {
        // Should never happen
        throw new Error('Style is not yet defined');
      }

      return axios.patch<Style>(`${LIST_STYLES}${styles.id}/`, {
        ...styles,
        name: page.name
      });
    },
    {
      onError: onSaveStylesError
    }
  );

  const updateStyle = async (styles: Partial<Style>, page: ContributionPage) => {
    return await updateStyleMutation.mutateAsync({ styles, page });
  };

  const createStyleMutation = useMutation(
    ({ styles, page }: { styles: Partial<Style>; page: ContributionPage }) => {
      if (!styles) {
        // Should never happen
        throw new Error('Style is not yet defined');
      }
      return axios.post<Style>(LIST_STYLES, {
        ...styles,
        name: page.name,
        revenue_program: page.revenue_program.id
      });
    },
    {
      onError: onSaveStylesError
    }
  );

  const createStyle = async (styles: Partial<Style>, page: ContributionPage) => {
    return await createStyleMutation.mutateAsync({ styles, page });
  };

  const deleteStyleMutation = useMutation(
    (styles: Partial<Style>) => {
      if (!styles || !styles.id) {
        // Should never happen
        throw new Error('Style is not yet defined');
      }
      return axios.delete(`${LIST_STYLES}${styles.id}/`);
    },
    {
      onError: (e) => {
        console.error(e);
        alert.error(GENERIC_ERROR);
      }
    }
  );

  const deleteStyle = async (styles: Partial<Style>) => {
    return await deleteStyleMutation.mutateAsync(styles);
  };

  return {
    styles,
    isLoading,
    isError,
    updateStyle,
    createStyle,
    deleteStyle,
    refetch: () => {
      queryClient.invalidateQueries(['styles']);
    }
  };
}

export default useStyleList;
