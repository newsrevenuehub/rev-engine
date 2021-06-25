import { useEffect, useState } from 'react';
import * as S from './PagesList.styled';

// Router
import { useHistory } from 'react-router-dom';

// Deps
import { useAlert } from 'react-alert';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// Routes
import { EDITOR_ROUTE } from 'routes';

// AJAX
import axios from 'ajax/axios';
import { LIST_PAGES } from 'ajax/endpoints';

// TEMP
import Button from 'elements/buttons/Button';

function PagesList() {
  const alert = useAlert();
  const history = useHistory();
  const [pages, setPages] = useState([]);

  useEffect(() => {
    async function fetchPages() {
      try {
        const { data } = await axios.get(LIST_PAGES);
        setPages(data.results);
      } catch (e) {
        alert.error(GENERIC_ERROR);
      }
    }
    fetchPages();
  }, [alert]);

  const handleEditPage = (pageSlug) => {
    history.push(`${EDITOR_ROUTE}/${pageSlug}`);
  };

  return (
    <S.PagesList data-testid="pages-list">
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
