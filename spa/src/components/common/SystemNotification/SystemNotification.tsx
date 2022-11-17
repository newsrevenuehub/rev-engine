import PropTypes, { InferProps } from 'prop-types';
import { ReactChild } from 'react';
import {
  CheckCircleOutlineOutlined as SuccessIcon,
  CloseOutlined as CloseIcon,
  ErrorOutlineOutlined as ErrorIcon,
  InfoOutlined as InfoIcon,
  ReportProblemOutlined as WarningIcon,
  SvgIconComponent
} from '@material-ui/icons';

import { IconBox, IconBoxIcon, IconButton, Header, Main, SystemNotificationWrapper } from './SystemNotification.styled';

import { SystemNotificationType } from './commonTypes';

const SystemNotificationPropTypes = {
  type: PropTypes.string.isRequired,
  header: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  handleClose: PropTypes.func.isRequired
};

interface SystemNotificationProps extends InferProps<typeof SystemNotificationPropTypes> {
  type: SystemNotificationType;
  children: ReactChild | ReactChild[];
  handleClose: () => void;
}

const IconRecord: Record<SystemNotificationType, SvgIconComponent> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon
};

export default function SystemNotification({ type, header, children, handleClose }: SystemNotificationProps) {
  const Icon = IconRecord[type];
  return (
    <SystemNotificationWrapper role="status">
      <IconBox notificationType={type}>
        <IconBoxIcon>
          <Icon />
        </IconBoxIcon>
      </IconBox>
      <Main>
        <Header notificationType={type}>{header}</Header>
        {children}
      </Main>
      <IconButton onClick={handleClose} aria-label="close notification">
        <CloseIcon />
      </IconButton>
    </SystemNotificationWrapper>
  );
}

SystemNotification.propTypes = SystemNotificationPropTypes;
