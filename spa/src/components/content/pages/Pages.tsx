import { useQuery } from '@tanstack/react-query';
import orderBy from 'lodash.orderby';
import { Fragment, useMemo, useState } from 'react';
import { useAlert } from 'react-alert';
import join from 'url-join';
import { Content } from './Pages.styled';

// Router
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Constants
import { USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';
import { GENERIC_ERROR } from 'constants/textConstants';
// AJAX
import axios from 'ajax/axios';
import { LIST_PAGES } from 'ajax/endpoints';

// Children
import EditButton from 'components/common/Button/EditButton';
import Hero from 'components/common/Hero';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';
import { Page } from 'hooks/useUser.types';

import AddPage from './AddPage';

export const pagesbyRP = (pgsRaw: Page[], qry?: string) => {
  const pagesByRevProgram: { name: string; pages: Page[] }[] = [];
  const pgs = qry
    ? pgsRaw?.filter((page) => {
        return (
          page?.revenue_program &&
          (page.slug.toLowerCase().indexOf(qry) !== -1 ||
            page.name.toLowerCase().indexOf(qry) !== -1 ||
            page.revenue_program.slug.toLowerCase().indexOf(qry) !== -1 ||
            page.revenue_program.name.toLowerCase().indexOf(qry) !== -1)
        );
      })
    : pgsRaw;

  let revPrograms = new Set(pgs?.map((p) => p?.revenue_program?.id));

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

async function fetchPages() {
  const { data } = await axios.get(LIST_PAGES);

  return data;
}

function Pages() {
  const alert = useAlert();
  const history = useHistory();
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const { user, isLoading: userLoading } = useUser();
  const { data: pages, isLoading: pagesLoading } = useQuery(['pages'], fetchPages, {
    onError: () => alert.error(GENERIC_ERROR),
    initialData: []
  });

  const isLoading = pagesLoading || userLoading;

  const handleEditPage = (page: Page) => {
    const path = join([EDITOR_ROUTE, page.revenue_program.slug, page.slug, '/']);
    history.push({ pathname: path, state: { pageId: page.id } });
  };

  const pagesByRevenueProgram = pagesbyRP(pages, pageSearchQuery);

  const addPageButtonShouldBeDisabled = useMemo(() => {
    if ([USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE].includes(user?.role_type?.[0] || '')) {
      return false;
    }
    const pageLimit = user?.organizations?.[0]?.plan?.page_limit ?? 0;
    return pages.length + 1 > pageLimit;
  }, [pages.length, user?.organizations, user?.role_type]);

  return (
    <>
      <GenericErrorBoundary>
        {isLoading && <GlobalLoading />}
        <Hero
          title="Pages"
          subtitle="Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below."
          placeholder="Pages"
          onChange={setPageSearchQuery}
        />
        <Content data-testid="pages-list">
          <AddPage pagesByRevenueProgram={pagesByRevenueProgram} disabled={addPageButtonShouldBeDisabled} />
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
    </>
  );
}

export default Pages;
