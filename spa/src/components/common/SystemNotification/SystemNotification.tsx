import {
  CheckCircleOutlineOutlined as SuccessIcon,
  CloseOutlined as CloseIcon,
  ErrorOutlineOutlined as ErrorIcon,
  InfoOutlined as InfoIcon,
  ReportProblemOutlined as WarningIcon,
  SvgIconComponent
} from '@material-ui/icons';

import { IconBox, IconBoxIcon, IconButton, Header, Main, SystemNotificationWrapper } from './SystemNotification.styled';

import { SystemNotificationTypes } from './commonTypes';

interface SystemNotificationProps {
  type: SystemNotificationTypes;
  header: string;
  body: string;
  handleClose: () => void;
}

const IconRecord: Record<SystemNotificationTypes, SvgIconComponent> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon
};

export default function SystemNotification({ type, header, body, handleClose }: SystemNotificationProps) {
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
        <p>{body}</p>
      </Main>
      <IconButton onClick={handleClose} aria-label="close notification">
        <CloseIcon />
      </IconButton>
    </SystemNotificationWrapper>
  );
}
