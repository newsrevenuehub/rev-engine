import orderBy from 'lodash.orderby';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import join from 'url-join';
import { ContributionPageButton } from 'components/common/Button/ContributionPageButton';
import Hero from 'components/common/Hero';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { GlobalLoading } from 'components/common/GlobalLoading';
import { ContributionPage } from 'hooks/useContributionPage';
import useContributionPageList from 'hooks/useContributionPageList';
import { EDITOR_ROUTE } from 'routes';
import { isStringInStringCaseInsensitive } from 'utilities/isStringInString';
import AddPage from './AddPage';
import { Content, PageUsage } from './Pages.styled';
import Searchbar from 'components/common/TextField/Searchbar';

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
      return orderBy(pages, ['revenue_program.name', 'name']);
    }

    return orderBy(
      pages.filter(
        (page) =>
          (page.slug && isStringInStringCaseInsensitive(page.slug, pageSearchQuery)) ||
          isStringInStringCaseInsensitive(page.name, pageSearchQuery) ||
          isStringInStringCaseInsensitive(page.revenue_program.name, pageSearchQuery) ||
          isStringInStringCaseInsensitive(page.revenue_program.slug, pageSearchQuery)
      ),
      ['revenue_program.name', 'name']
    );
  }, [pageSearchQuery, pages]);

  const handleEditPage = (page: ContributionPage) =>
    history.push(join([EDITOR_ROUTE, 'pages', page.id.toString(), '/']));

  return (
    <GenericErrorBoundary>
      <Hero
        title="Pages"
        cornerContent={<Searchbar onChange={setPageSearchQuery} placeholder="Pages" />}
        subtitle="Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below."
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
