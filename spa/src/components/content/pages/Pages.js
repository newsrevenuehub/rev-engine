import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import orderBy from 'lodash.orderby';
import join from 'url-join';
import { Content } from './Pages.styled';

// Router
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Deps
import { useAlert } from 'react-alert';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';
import { USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE } from 'constants/authConstants';
// AJAX
import { LIST_PAGES } from 'ajax/endpoints';
import axios from 'ajax/axios';

// Children
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import EditButton from 'components/common/Button/EditButton';
import NewButton from 'components/common/Button/NewButton';
import Hero from 'components/common/Hero';
import useModal from 'hooks/useModal';
import useUser from 'hooks/useUser';
import GlobalLoading from 'elements/GlobalLoading';

import AddPageModal from './AddPageModal';

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

async function fetchPages() {
  const { data } = await axios.get(LIST_PAGES);

  return data;
}

function Pages() {
  const alert = useAlert();
  const history = useHistory();
  const [pageSearchQuery, setPageSearchQuery] = useState([]);
  const { open: showAddPageModal, handleClose, handleOpen } = useModal();
  const { user, isLoading: userLoading } = useUser();
  const { data: pages, isLoading: pagesLoading } = useQuery(['pages'], fetchPages, {
    onError: () => alert.error(GENERIC_ERROR),
    initialData: []
  });

  const isLoading = pagesLoading || userLoading;

  const handleEditPage = (page) => {
    const path = join([EDITOR_ROUTE, page.revenue_program.slug, page.slug, '/']);
    history.push({ pathname: path, state: { pageId: page.id } });
  };

  const pagesByRevenueProgram = pagesbyRP(pages, pageSearchQuery);

  const addPageButtonShouldBeDisabled = () => {
    if ([USER_ROLE_HUB_ADMIN_TYPE, USER_SUPERUSER_TYPE].includes(user?.role_type?.[0])) {
      return false;
    }
    const pageLimit = user?.organizations?.[0]?.plan?.page_limit ?? 0;
    return pages.length + 1 > pageLimit;
  };

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
          <NewButton data-testid="new-page-button" disabled={addPageButtonShouldBeDisabled()} onClick={handleOpen} />
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
      {showAddPageModal && (
        <AddPageModal
          isOpen={showAddPageModal}
          closeModal={handleClose}
          pagesByRevenueProgram={pagesByRevenueProgram}
        />
      )}
    </>
  );
}

export default Pages;
