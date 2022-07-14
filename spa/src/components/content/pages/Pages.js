import { useEffect, useState, useCallback } from 'react';
import * as S from './Pages.styled';

// Router
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Deps
import { faChevronDown, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useAlert } from 'react-alert';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_PAGES } from 'ajax/endpoints';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import PageCard from 'components/content/pages/PageCard';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

const PAGE_COUNT_TO_ENABLE_SEARCH = 4;

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
  const alert = useAlert();
  const history = useHistory();
  const requestGetPages = useRequest();
  const [closedAccordions, setClosedAccordions] = useState([]);
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

  const handleAccordionClick = (i) => {
    const indexClicked = closedAccordions.indexOf(i);
    const newClosed = [...closedAccordions];
    if (indexClicked !== -1) {
      newClosed.splice(indexClicked, 1);
      setClosedAccordions(newClosed);
    } else {
      newClosed.push(i);
      setClosedAccordions(newClosed);
    }
  };

  const pagesByRevenueProgram = pagesbyRP(pages, pageSearchQuery);

  return (
    <GenericErrorBoundary>
      <S.Pages data-testid="pages-list" layout>
        {pages && pages.length > PAGE_COUNT_TO_ENABLE_SEARCH ? (
          <S.PagesSearch layout>
            <input
              placeholder="Search Pages by Name, Revenue-program"
              onChange={(e) => setPageSearchQuery(e.target.value)}
            />
          </S.PagesSearch>
        ) : null}
        <S.RevProgramList layout>
          {pagesByRevenueProgram.map((rp, i) => {
            const isOpen = !closedAccordions.includes(i);
            return (
              <S.RevenueProgramSection key={rp.name + i} layout data-testid={`rev-list-${rp.name}`}>
                <S.AccordionHeading
                  layout
                  isOpen={isOpen}
                  onClick={() => handleAccordionClick(i)}
                  data-testid={`rev-list-heading-${rp.name}`}
                >
                  <S.RevProgramName>{rp.name}</S.RevProgramName>
                  <S.Chevron icon={faChevronDown} isOpen={isOpen} />
                </S.AccordionHeading>
                {isOpen && (
                  <S.PagesList layout {...S.accordionAnimation} data-testid={`${rp.name}-pages-list`}>
                    {rp.pages.map((page) => (
                      <PageCard key={page.id} page={page} onClick={handleEditPage} />
                    ))}
                  </S.PagesList>
                )}
              </S.RevenueProgramSection>
            );
          })}
        </S.RevProgramList>
        <S.ButtonSection>
          <S.PlusButton onClick={() => setShowAddPageModal(true)} data-testid="page-create-button">
            <CircleButton icon={faPlus} />
          </S.PlusButton>
        </S.ButtonSection>
      </S.Pages>
    </GenericErrorBoundary>
  );
}

export default Pages;

function revProgramKeysSort(a, b) {
  const nameA = a.name.toLowerCase();
  const nameB = b.name.toLowerCase();
  return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
}
