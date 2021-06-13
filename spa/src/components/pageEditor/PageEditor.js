import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import * as S from './PageEditor.styled';
import { useTheme } from 'styled-components';
import { AnimatePresence } from 'framer-motion';

// Routing
import { useParams } from 'react-router-dom';

// AJAX
import axios from 'ajax/axios';
import { FULL_PAGE } from 'ajax/endpoints';

// Assets
import { faEye, faEdit, faSave } from '@fortawesome/free-solid-svg-icons';

// Children
import DonationPage from 'components/donationPage/DonationPage';
import GlobalLoading from 'elements/GlobalLoading';
import EditInterface from 'components/pageEditor/editInterface/EditInterface';

const PageEditorContext = createContext();

const EDIT = 'EDIT';
const PREVIEW = 'PREVIEW';

function PageEditor() {
  const theme = useTheme();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState();
  const [selectedButton, setSelectedButton] = useState(PREVIEW);
  const [showEditInterface, setShowEditInterface] = useState(false);

  const fetchLivePageContent = useCallback(async () => {
    setLoading(true);
    const { revProgramSlug, pageSlug } = params;
    const requestParams = {
      revenue_program: revProgramSlug,
      page: pageSlug,
      live: 0
    };
    try {
      const { data } = await axios.get(FULL_PAGE, { params: requestParams });
      setPage(data);
      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchLivePageContent();
  }, [params, fetchLivePageContent]);

  const handlePreview = () => {
    setSelectedButton(PREVIEW);
    setShowEditInterface(false);
  };

  const handleEdit = () => {
    setSelectedButton(EDIT);
    setShowEditInterface(true);
  };

  const handleSave = () => {
    setSelectedButton();
  };

  return (
    <PageEditorContext.Provider value={{ page, showEditInterface, setShowEditInterface }}>
      <S.PageEditor>
        {loading && <GlobalLoading />}
        {showEditInterface && (
          <AnimatePresence>
            <EditInterface />
          </AnimatePresence>
        )}
        {page && <DonationPage live={false} page={page} />}
        <S.ButtonOverlay>
          <S.EditorButton onClick={handlePreview} selected={selectedButton === PREVIEW}>
            <S.Icon icon={faEye} color={theme.colors.primary} />
          </S.EditorButton>
          <S.EditorButton onClick={handleEdit} selected={selectedButton === EDIT}>
            <S.Icon icon={faEdit} color={theme.colors.primary} />
          </S.EditorButton>
          <S.EditorButton onClick={handleSave}>
            <S.Icon icon={faSave} color={theme.colors.primary} />
          </S.EditorButton>
        </S.ButtonOverlay>
      </S.PageEditor>
    </PageEditorContext.Provider>
  );
}

export const usePageEditorContext = () => useContext(PageEditorContext);

export default PageEditor;
