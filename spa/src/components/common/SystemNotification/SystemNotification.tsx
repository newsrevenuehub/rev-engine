import { IconBox, IconBoxIcon, IconButton, Header, Main, SystemNotificationWrapper } from './SystemNotification.styled';
import {
  CheckCircleOutlineOutlined as SuccessIcon,
  CloseOutlined as CloseIcon,
  ErrorOutlineOutlined as ErrorIcon,
  InfoOutlined as InfoIcon,
  ReportProblemOutlined as WarningIcon
} from '@material-ui/icons';

import { SystemNotificationTypes } from './commonTypes';

interface SystemNotificationProps {
  type: SystemNotificationTypes;
  header: string;
  body: string;
  handleClose: Function;
}

export default function SystemNotification({ type, header, body, handleClose }: SystemNotificationProps) {
  let Icon;
  switch (type) {
    case 'success':
      Icon = SuccessIcon;
      break;
    case 'error':
      Icon = ErrorIcon;
      break;
    case 'warning':
      Icon = WarningIcon;
      break;
    case 'info':
      Icon = InfoIcon;
      break;
  }

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
