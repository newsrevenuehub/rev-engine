import { useState, useCallback } from 'react';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';

// Deps
import { useAlert } from 'react-alert';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import Styles from 'components/content/styles/Styles';
import EditStylesModal from 'components/content/styles/EditStylesModal';

function Customize() {
  const alert = useAlert();
  const requestGetStyles = useRequest();
  const [showEditStylesModal, setShowEditStylesModal] = useState(false);
  const [styleToEdit, setStyleToEdit] = useState(null);
  const [styles, setStyles] = useState([]);

  const handleCloseEditStylesModal = () => {
    setShowEditStylesModal(false);
    setStyleToEdit(null);
  };

  const fetchStyles = useCallback(() => {
    requestGetStyles(
      { method: 'GET', url: LIST_STYLES },
      {
        onSuccess: ({ data }) => {
          setStyles(
            data.map(({ styles, id, revenue_program, name, used_live }) => {
              return { ...styles, id, revenue_program, name, used_live };
            })
          );
        },
        onFailure: () => alert.error(GENERIC_ERROR)
      }
    );
  }, [alert]);

  return (
    <>
      <DashboardSectionGroup data-testid="content">
        <DashboardSection heading="Styles" collapsible data-testid="styles-section">
          <Styles
            setShowEditStylesModal={setShowEditStylesModal}
            setStyleToEdit={setStyleToEdit}
            fetchStyles={fetchStyles}
            styles={styles}
          />
        </DashboardSection>
      </DashboardSectionGroup>
      {showEditStylesModal && (
        <EditStylesModal
          styleToEdit={styleToEdit}
          isOpen={showEditStylesModal}
          closeModal={handleCloseEditStylesModal}
          onStylesUpdated={fetchStyles}
        />
      )}
    </>
  );
}

export default Customize;
