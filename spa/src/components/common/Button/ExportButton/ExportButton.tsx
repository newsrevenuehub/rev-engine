import PropTypes, { InferProps } from 'prop-types';
import { useCallback, useState } from 'react';
import { useSnackbar } from 'notistack';

import LogoutIcon from 'assets/icons/logout.svg';
import { Tooltip } from 'components/base';
import useModal from 'hooks/useModal';
import useRequest from 'hooks/useRequest';

import { Button, CircularProgress, ExportIcon, Flex } from './ExportButton.styled';
import ExportModal from './ExportModal';
import SystemNotification from 'components/common/SystemNotification';
import { CONTRIBUTIONS, EMAIL_CONTRIBUTIONS } from 'ajax/endpoints';

export type ExportButtonProps = InferProps<typeof ExportButtonPropTypes>;

const ExportButton = ({ className, ...rest }: ExportButtonProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const { open: showTooltip, handleClose: handleCloseTooltip, handleOpen: handleOpenTooltip } = useModal();
  const { open, handleClose, handleOpen } = useModal();
  const [loading, setLoading] = useState(false);
  const requestExportData = useRequest();

  const exportData = useCallback(() => {
    setLoading(true);
    requestExportData(
      {
        method: 'POST',
        url: `${CONTRIBUTIONS}${EMAIL_CONTRIBUTIONS}`
      },
      {
        onSuccess: () => {
          enqueueSnackbar(
            'Your contributions export is in progress and will be sent to your email address when complete.',
            {
              persist: true,
              content: (key: string, message: string) => (
                <SystemNotification id={key} message={message} header="Export in Progress" type="success" />
              )
            }
          );
          setTimeout(() => setLoading(false), 30000);
        },
        onFailure: () => {
          setLoading(false);
          enqueueSnackbar('There’s been a problem with your contributions export. Please try again.', {
            persist: true,
            content: (key: string, message: string) => (
              <SystemNotification id={key} message={message} header="Export Failed" type="error" />
            )
          });
        }
      }
    );
  }, [enqueueSnackbar, requestExportData]);

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
