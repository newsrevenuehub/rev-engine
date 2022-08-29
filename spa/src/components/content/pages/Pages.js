import { useEffect, useState, Fragment } from 'react';
import useStyles, { Hero, Content } from './Pages.styled';

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
import HeaderSection from 'components/common/HeaderSection';
import Searchbar from 'components/common/Searchbar';
import PageButton from 'components/common/Button/PageButton';
import NewButton from 'components/common/Button/NewButton';

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
  return pagesByRevProgram.sort(revProgramKeysSort);
};

function Pages({ setShowAddPageModal }) {
  const classes = useStyles();
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
    const path = `${EDITOR_ROUTE}/${page.revenue_program.slug}/${page.slug}`;
    history.push({ pathname: path, state: { pageId: page.id } });
  };

  const pagesByRevenueProgram = pagesbyRP(pages, pageSearchQuery);

  return (
    <GenericErrorBoundary>
      <Hero>
        <HeaderSection
          title="Pages"
          subtitle="Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below."
        />
        <Searchbar placeholder="Pages" className={classes.searchbar} onChange={setPageSearchQuery} />
      </Hero>
      <Content data-testid="pages-list">
        <NewButton onClick={() => setShowAddPageModal(true)} />
        {pagesByRevenueProgram.length &&
          pagesByRevenueProgram.map((revenueProgram) => (
            <Fragment key={revenueProgram.name}>
              {revenueProgram.pages.map((donationPage) => (
                <PageButton key={donationPage.id} {...donationPage} onClick={() => handleEditPage(donationPage)} />
              ))}
            </Fragment>
          ))}
      </Content>
    </GenericErrorBoundary>
  );
}

export default Pages;

function revProgramKeysSort(a, b) {
  const nameA = a.name.toLowerCase();
  const nameB = b.name.toLowerCase();
  return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
}
