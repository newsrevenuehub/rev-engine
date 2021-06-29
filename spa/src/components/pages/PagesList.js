import { useEffect, useState } from 'react';
import * as S from './PagesList.styled';

// Router
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

import { useAlert } from 'react-alert';

// AJAX
import useRequest from 'hooks/useRequest';
// import axios from 'ajax/axios';
import { LIST_PAGES } from 'ajax/endpoints';

// TEMP
import Button from 'elements/buttons/Button';

function PagesList() {
  const alert = useAlert();
  const history = useHistory();
  const requestGetPages = useRequest();
  const [pages, setPages] = useState([]);

  useEffect(() => {
    requestGetPages(
      { method: 'GET', url: LIST_PAGES },
      {
        onSuccess: ({ data }) => setPages(data.results),
        onFailure: () => alert.error(GENERIC_ERROR)
      }
    );
  }, [alert]);

  const handleEditPage = (pageSlug) => {
    history.push(`${EDITOR_ROUTE}/${pageSlug}`);
  };

  return (
    <S.PagesList>
      <S.List>
        {pages.map((page) => (
          <Button key={page.id} onClick={() => handleEditPage(page.derived_slug)}>
            [TEMP] Edit {page.name}
          </Button>
        ))}
      </S.List>
    </S.PagesList>
  );
}

export default PagesList;
