import { useState, useCallback } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useAlert } from 'react-alert';
import join from 'url-join';

import { EDITOR_ROUTE } from 'routes';
import slugify from 'utilities/slugify';
import useRequest from 'hooks/useRequest';
import { LIST_PAGES } from 'ajax/endpoints';
import useUser from 'hooks/useUser';
import NewButton from 'components/common/Button/NewButton';
import useModal from 'hooks/useModal';
import AddPageModal from 'components/common/Modal/AddPageModal';
import { Page } from 'hooks/useUser.types';

type AddPageType = InferProps<typeof AddPagePropTypes>;

function AddPage({ pagesByRevenueProgram, disabled }: AddPageType) {
  const alert = useAlert();
  const { open, handleClose, handleOpen } = useModal();
  const history = useHistory();
  const { user } = useUser();
  const createPage = useRequest();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const getTemporaryPageName = useCallback((pages: typeof pagesByRevenueProgram[number]['pages']) => {
    const pagesSize = (pages?.length ?? 0) + 1;
    const slugs = pages ? pages.map(({ slug }) => slug) : [];
    let number = pagesSize;
    let tempName = `Page ${number}`;
    let tempSlug = slugify(tempName);
    while (slugs.includes(tempSlug)) {
      number += 1;
      tempName = `Page ${number}`;
      tempSlug = slugify(tempName);
    }
    return { tempName, tempSlug };
  }, []);

  const handleSaveFailure = useCallback(
    (e) => {
      setLoading(false);
      if (e.response?.data) {
        if (user?.revenue_programs?.length === 1) {
          alert.error(Object.values(e.response.data));
        } else {
          setError(Object.values(e.response.data as { [x: string]: string[] })[0][0]);
        }
      } else {
        alert.error('There was an error and we could not create your new page. We have been notified.');
      }
    },
    [alert, user?.revenue_programs?.length]
  );

  const handleSave = useCallback(
    (pagesBySelectedRp: typeof pagesByRevenueProgram[number]['pages'], revenueProgramId: string) => {
      setLoading(true);

      const { tempName, tempSlug } = getTemporaryPageName(pagesBySelectedRp);
      const formData = {
        name: tempName,
        slug: tempSlug,
        revenue_program: revenueProgramId
      };

      createPage(
        {
          method: 'POST',
          url: LIST_PAGES,
          data: formData
        },
        {
          onSuccess: ({ data }: { data: Page }) => {
            setLoading(false);
            history.push({
              pathname: join([EDITOR_ROUTE, data.revenue_program.slug, data.slug, '/']),
              state: { pageId: data.id }
            });
          },
          onFailure: handleSaveFailure
        }
      );
    },
    [createPage, handleSaveFailure, getTemporaryPageName, history]
  );

  const checkCreatePage = useCallback(() => {
    if (user?.revenue_programs?.length === 1) {
      handleSave(pagesByRevenueProgram[0]?.pages, user!.revenue_programs[0].id);
    } else {
      handleOpen();
    }
  }, [handleOpen, handleSave, pagesByRevenueProgram, user]);

  const handleModalSave = useCallback(
    (revenueProgramId: string) => {
      const rp = user?.revenue_programs.find((rp) => Number(rp.id) === Number(revenueProgramId));
      const pages = pagesByRevenueProgram?.find(({ name }) => name === rp?.name)?.pages ?? [];
      handleSave(pages, revenueProgramId);
    },
    [handleSave, pagesByRevenueProgram, user?.revenue_programs]
  );

  return (
    <>
      <NewButton buttonTestId="new-page-button" disabled={disabled} onClick={checkCreatePage} />
      {open && (
        <AddPageModal
          open={open}
          onClose={handleClose}
          onAddPage={handleModalSave}
          revenuePrograms={user?.revenue_programs ?? []}
          loading={loading}
          outerError={error}
        />
      )}
    </>
  );
}

const AddPagePropTypes = {
  pagesByRevenueProgram: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      pages: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          name: PropTypes.string.isRequired,
          slug: PropTypes.string.isRequired
        }).isRequired
      ).isRequired
    }).isRequired
  ).isRequired,
  disabled: PropTypes.bool
};

AddPage.propTypes = AddPagePropTypes;

AddPage.defaultProps = {
  disabled: false
};

export default AddPage;
