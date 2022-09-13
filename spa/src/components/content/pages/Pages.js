import { useEffect, useState, Fragment } from 'react';
import orderBy from 'lodash.orderby';
import { Content } from './Pages.styled';

// Router
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Deps
import { useAlert } from 'react-alert';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_PAGES } from 'ajax/endpoints';

// Children
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import EditButton from 'components/common/Button/EditButton';
import NewButton from 'components/common/Button/NewButton';
import Hero from 'components/common/Hero';
import joinPath from 'utilities/joinPath';

export const pagesbyRP = (pgsRaw, qry) => {
  const pagesByRevProgram = [];
  const pgs = qry
    ? pgsRaw.filter((page) => {
        return (
          page?.revenue_program &&
          (page.slug.toLowerCase().indexOf(qry) !== -1 ||
            page.name.toLowerCase().indexOf(qry) !== -1 ||
            page.revenue_program.slug.toLowerCase().indexOf(qry) !== -1 ||
            page.revenue_program.name.toLowerCase().indexOf(qry) !== -1)
        );
      })
    : pgsRaw;

  let revPrograms = new Set(pgs.map((p) => p?.revenue_program?.id));

  revPrograms.forEach((rpId) => {
    if (rpId) {
      const pagesForRp = pgs.filter((p) => p?.revenue_program?.id === rpId);
      pagesByRevProgram.push({
        name: pagesForRp[0].revenue_program.name,
        pages: pagesForRp
      });
    }
  });
  return orderBy(pagesByRevProgram, 'name');
};

function Pages({ setShowAddPageModal }) {
  const alert = useAlert();
  const history = useHistory();
  const requestGetPages = useRequest();
  const [pages, setPages] = useState([]);
  const [pageSearchQuery, setPageSearchQuery] = useState([]);

  useEffect(() => {
    requestGetPages(
      { method: 'GET', url: LIST_PAGES },
      {
        onSuccess: ({ data }) => {
          setPages(data);
        },
        onFailure: () => alert.error(GENERIC_ERROR)
      }
    );
  }, [alert]);

  const handleEditPage = (page) => {
    const path = joinPath([EDITOR_ROUTE, page.revenue_program.slug, page.slug, '/']);
    history.push({ pathname: path, state: { pageId: page.id } });
  };

  const pagesByRevenueProgram = pagesbyRP(pages, pageSearchQuery);

  return (
    <GenericErrorBoundary>
      <Hero
        title="Pages"
        subtitle="Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below."
        placeholder="Pages"
        onChange={setPageSearchQuery}
      />
      <Content data-testid="pages-list">
        <NewButton onClick={() => setShowAddPageModal(true)} />
        {!!pagesByRevenueProgram.length &&
          pagesByRevenueProgram.map((revenueProgram) => (
            <Fragment key={revenueProgram.name}>
              {revenueProgram.pages.map((donationPage) => (
                <EditButton key={donationPage.id} {...donationPage} onClick={() => handleEditPage(donationPage)} />
              ))}
            </Fragment>
          ))}
      </Content>
    </GenericErrorBoundary>
  );
}

export default Pages;
