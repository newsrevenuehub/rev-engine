import { useEffect, useState, useCallback } from 'react';
import * as S from './PagesList.styled';

// Router
import { useHistory } from 'react-router-dom';
import { EDITOR_ROUTE } from 'routes';

// Deps
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence } from 'framer-motion';
import { useAlert } from 'react-alert';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_PAGES } from 'ajax/endpoints';

// Children
import PageCard from 'components/pages/PageCard';

function PagesList() {
  const alert = useAlert();
  const history = useHistory();
  const requestGetPages = useRequest();
  const [pagesByRevenueProgram, setPagesByRevenueProgram] = useState([]);
  const [closedAccordions, setClosedAccordions] = useState([]);

  const formatPagesList = useCallback((pgs) => {
    const pagesByRevProgram = [];
    const revPrograms = new Set(pgs.map((p) => p.revenue_program.id));
    revPrograms.forEach((rpId) => {
      const pagesForRp = pgs.filter((p) => p.revenue_program.id === rpId);
      pagesByRevProgram.push({
        name: pagesForRp[0].revenue_program.name,
        pages: pagesForRp
      });
    });
    return pagesByRevProgram.sort(revProgramKeysSort);
  }, []);

  useEffect(() => {
    requestGetPages(
      { method: 'GET', url: LIST_PAGES },
      {
        onSuccess: ({ data }) => {
          console.log('data tho: ', data);
          setPagesByRevenueProgram(formatPagesList(data.results));
        },
        onFailure: () => alert.error(GENERIC_ERROR)
      }
    );
  }, [alert, formatPagesList]);

  const handleEditPage = (pageSlug) => {
    history.push(`${EDITOR_ROUTE}/${pageSlug}`);
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

  return (
    <S.PagesList data-testid="pages-list" layout>
      <S.RevProgramList layout>
        {pagesByRevenueProgram.map((rp, i) => {
          const isOpen = !closedAccordions.includes(i);
          return (
            <S.RevenueProgramSection key={rp.name + i} layout>
              <S.AccordionHeading layout isOpen={isOpen} onClick={() => handleAccordionClick(i)}>
                <S.RevProgramName>{rp.name}</S.RevProgramName>
                <S.Chevron icon={faChevronDown} isOpen={isOpen} />
              </S.AccordionHeading>
              <AnimatePresence>
                {isOpen && (
                  <S.InnerPagesList layout {...S.accordionAnimation}>
                    {rp.pages.map((page) => (
                      <PageCard key={page.id} page={page} onClick={handleEditPage} />
                    ))}
                  </S.InnerPagesList>
                )}
              </AnimatePresence>
            </S.RevenueProgramSection>
          );
        })}
      </S.RevProgramList>
    </S.PagesList>
  );
}

export default PagesList;

function revProgramKeysSort(a, b) {
  const nameA = a.name.toLowerCase();
  const nameB = b.name.toLowerCase();
  return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
}
