import orderBy from 'lodash.orderby';
import { Fragment, useState } from 'react';
import join from 'url-join';
import { Content, PageUsage } from './Pages.styled';

// Router
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Children
import Hero from 'components/common/Hero';
import { ContributionPageButton } from 'components/common/Button/ContributionPageButton';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { isStringInStringCaseInsensitive } from 'utilities/isStringInString';
import GlobalLoading from 'elements/GlobalLoading';
import { ContributionPage } from 'hooks/useContributionPage';

import AddPage from './AddPage';
import useContributionPageList from 'hooks/useContributionPageList';

export const pagesbyRP = (pgsRaw: ContributionPage[], qry?: string) => {
  const pagesByRevProgram: { name: string; pages: ContributionPage[] }[] = [];
  const pgs = qry
    ? pgsRaw?.filter((page) => {
        return (
          page?.revenue_program &&
          (isStringInStringCaseInsensitive(page.slug, qry) ||
            isStringInStringCaseInsensitive(page.name, qry) ||
            isStringInStringCaseInsensitive(page.revenue_program.slug, qry) ||
            isStringInStringCaseInsensitive(page.revenue_program.name, qry))
        );
      })
    : pgsRaw;

  const revPrograms = new Set(pgs?.map((p) => p?.revenue_program?.id));

  revPrograms.forEach((rpId) => {
    if (rpId) {
      const pagesForRp = pgs?.filter((p) => p?.revenue_program?.id === rpId);
      pagesByRevProgram.push({
        name: pagesForRp[0].revenue_program.name,
        pages: pagesForRp
      });
    }
  });
  return orderBy(pagesByRevProgram, 'name');
};

function Pages() {
  const history = useHistory();
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const { pages, isLoading } = useContributionPageList();
  const handleEditPage = (page: ContributionPage) =>
    history.push(join([EDITOR_ROUTE, 'pages', page.id.toString(), '/']));
  const pagesByRevenueProgram = pagesbyRP(pages ?? [], pageSearchQuery);

  if (isLoading) {
    return (
      <div data-testid="pages-loading">
        <GlobalLoading />
      </div>
    );
  }

  return (
    <GenericErrorBoundary>
      <Hero
        title="Pages"
        subtitle="Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below."
        placeholder="Pages"
        onChange={setPageSearchQuery}
      />
      <Content data-testid="pages-list">
        <AddPage />
        {!!pagesByRevenueProgram.length &&
          pagesByRevenueProgram.map((revenueProgram) => (
            <Fragment key={revenueProgram.name}>
              {revenueProgram.pages.map((donationPage) => (
                <Fragment key={donationPage.id}>
                  <ContributionPageButton page={donationPage} onClick={() => handleEditPage(donationPage)} />
                </Fragment>
              ))}
            </Fragment>
          ))}
      </Content>
      <PageUsage />
    </GenericErrorBoundary>
  );
}

export default Pages;
