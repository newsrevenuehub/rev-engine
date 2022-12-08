import PropTypes, { InferProps } from 'prop-types';
import { useCallback, useState } from 'react';
import { useAlert } from 'react-alert';

import LogoutIcon from 'assets/icons/logout.svg';
import { Tooltip } from 'components/base';
import { GENERIC_ERROR } from 'constants/textConstants';
import useModal from 'hooks/useModal';
import useRequest from 'hooks/useRequest';

import { Button, CircularProgress, ExportIcon, Flex } from './ExportButton.styled';
import ExportModal from './ExportModal';
import { CONTRIBUTIONS, EMAIL_CONTRIBUTIONS } from 'ajax/endpoints';

export type ExportButtonProps = InferProps<typeof ExportButtonPropTypes>;

const ExportButton = ({ className, ...rest }: ExportButtonProps) => {
  const { open: showTooltip, handleClose: handleCloseTooltip, handleOpen: handleOpenTooltip } = useModal();
  const { open, handleClose, handleOpen } = useModal();
  const [loading, setLoading] = useState(false);
  const requestExportData = useRequest();

  const alert = useAlert();

  const exportData = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 30000);
    requestExportData(
      {
        method: 'POST',
        url: `${CONTRIBUTIONS}${EMAIL_CONTRIBUTIONS}`
      },
      {
        onSuccess: () => {},
        onFailure: (e: any) => {
          setLoading(false);
          alert.error(GENERIC_ERROR);
        }
      }
    );
  }, [alert, requestExportData]);

  return (
    <Flex className={className!}>
      <Tooltip
        title={<p style={{ color: 'white', margin: 0 }}>Export is being sent</p>}
        placement="bottom-end"
        open={showTooltip && loading}
        onClose={handleCloseTooltip}
        onOpen={handleOpenTooltip}
      >
        {/* Disabled elements do not fire events. Need the DIV over button for tooltip to listen to events. */}
        <div data-testid="export-button-wrapper">
          <Button
            color="secondary"
            variant="contained"
            onClick={handleOpen}
            data-testid="export-button"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <ExportIcon src={LogoutIcon} alt="Sign out" />}
          >
            {loading ? 'Sending...' : 'Export'}
          </Button>
        </div>
      </Tooltip>
      {open && <ExportModal open={open} onClose={handleClose} onExport={exportData} {...rest} />}
    </Flex>
  );
};

const ExportButtonPropTypes = {
  className: PropTypes.string,
  transactions: PropTypes.number.isRequired,
  email: PropTypes.string.isRequired
};

ExportButton.propTypes = ExportButtonPropTypes;

ExportButton.defaultProps = {
  className: ''
};

export default ExportButton;
