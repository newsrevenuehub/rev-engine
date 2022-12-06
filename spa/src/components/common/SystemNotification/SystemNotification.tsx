import PropTypes, { InferProps } from 'prop-types';
import { forwardRef } from 'react';
import {
  CheckCircleOutlineOutlined as SuccessIcon,
  CloseOutlined as CloseIcon,
  ErrorOutlineOutlined as ErrorIcon,
  InfoOutlined as InfoIcon,
  ReportProblemOutlined as WarningIcon,
  SvgIconComponent
} from '@material-ui/icons';

import { useSnackbar, SnackbarContent, SnackbarContentProps } from 'notistack';
import {
  IconBox,
  IconBoxIcon,
  IconButton,
  Header,
  Main,
  SystemNotificationWrapper,
  Typography
} from './SystemNotification.styled';

import { notificationTypeValues, SystemNotificationType } from './commonTypes';

const SystemNotificationPropTypes = {
  type: PropTypes.oneOf(notificationTypeValues).isRequired,
  header: PropTypes.string.isRequired,
  message: PropTypes.node.isRequired
};

export interface SystemNotificationProps extends SnackbarContentProps, InferProps<typeof SystemNotificationPropTypes> {
  type: SystemNotificationType;
}

const IconRecord: Record<SystemNotificationType, SvgIconComponent> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon
};

const SystemNotification = forwardRef<HTMLDivElement, SystemNotificationProps>(({ id, type, header, message }, ref) => {
  const { closeSnackbar } = useSnackbar();
  const Icon = IconRecord[type];

  return (
    <SnackbarContent ref={ref}>
      <SystemNotificationWrapper role="status">
        <IconBox notificationType={type}>
          <IconBoxIcon>
            <Icon />
          </IconBoxIcon>
        </IconBox>
        <Main>
          <Header notificationType={type}>{header}</Header>
          {typeof message === 'string' ? <Typography variant="body1">{message}</Typography> : message}
        </Main>
        <IconButton onClick={() => closeSnackbar(id)} aria-label="close notification">
          <CloseIcon />
        </IconButton>
      </SystemNotificationWrapper>
    </SnackbarContent>
  );
});

SystemNotification.propTypes = SystemNotificationPropTypes;

export default SystemNotification;
