import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import join from 'url-join';
import { ContributionPageButton } from 'components/common/Button/ContributionPageButton';
import Hero from 'components/common/Hero';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import GlobalLoading from 'elements/GlobalLoading';
import { ContributionPage } from 'hooks/useContributionPage';
import useContributionPageList from 'hooks/useContributionPageList';
import { EDITOR_ROUTE } from 'routes';
import { isStringInStringCaseInsensitive } from 'utilities/isStringInString';
import AddPage from './AddPage';
import { Content, PageUsage } from './Pages.styled';

/**
 * Custom sort function for contribution pages. Sorts by revenue program name,
 * then page name.
 */
function comparePages(a: ContributionPage, b: ContributionPage) {
  if (a.revenue_program.name < b.revenue_program.name) {
    return -1;
  }

  if (a.revenue_program.name > b.revenue_program.name) {
    return 1;
  }

  if (a.name < b.name) {
    return -1;
  }

  if (a.name > b.name) {
    return 1;
  }

  return 0;
}

function Pages() {
  const history = useHistory();
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const { pages, isLoading } = useContributionPageList();
  const visiblePages = useMemo(() => {
    if (!pages) {
      return [];
    }

    // Filter by search query, then sort. A page might not have a slug.

    if (pageSearchQuery === '') {
      return [...pages].sort(comparePages);
    }

    return pages
      .filter(
        (page) =>
          (page.slug && isStringInStringCaseInsensitive(page.slug, pageSearchQuery)) ||
          isStringInStringCaseInsensitive(page.name, pageSearchQuery) ||
          isStringInStringCaseInsensitive(page.revenue_program.name, pageSearchQuery) ||
          isStringInStringCaseInsensitive(page.revenue_program.slug, pageSearchQuery)
      )
      .sort(comparePages);
  }, [pageSearchQuery, pages]);

  const handleEditPage = (page: ContributionPage) =>
    history.push(join([EDITOR_ROUTE, 'pages', page.id.toString(), '/']));

  return (
    <GenericErrorBoundary>
      <Hero
        title="Pages"
        subtitle="Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below."
        placeholder="Pages"
        onChange={setPageSearchQuery}
      />
      {isLoading ? (
        <div data-testid="pages-loading">
          <GlobalLoading />
        </div>
      ) : (
        <>
          <Content data-testid="pages-list">
            <AddPage />
            {visiblePages.map((page) => (
              <ContributionPageButton key={page.id} page={page} onClick={() => handleEditPage(page)} />
            ))}
          </Content>
          <PageUsage />
        </>
      )}
    </GenericErrorBoundary>
  );
}

export default Pages;
