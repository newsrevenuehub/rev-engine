import { useState, useCallback } from 'react';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';

// Deps
import { useAlert } from 'react-alert';

// Children
import Styles from 'components/content/styles/Styles';
import EditStylesModal from 'components/content/styles/EditStylesModal';
import PageTitle from 'elements/PageTitle';

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
  }, [alert, requestGetStyles]);

  return (
    <>
      <PageTitle title="Customize" />
      <Styles
        setShowEditStylesModal={setShowEditStylesModal}
        setStyleToEdit={setStyleToEdit}
        fetchStyles={fetchStyles}
        styles={styles}
      />
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
