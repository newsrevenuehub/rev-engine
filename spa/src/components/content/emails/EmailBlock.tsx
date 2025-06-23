import PropTypes, { InferProps } from 'prop-types';
import { Actions, Description, Name, Root, SendTestButton } from './EmailBlock.styled';
import { RouterLinkButton } from 'components/base';
import { EditOutlined, RemoveRedEyeOutlined } from '@material-ui/icons';

const EmailBlockPropTypes = {
  description: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  editable: PropTypes.bool,
  emailType: PropTypes.string,
  hideActions: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onSendTest: PropTypes.func
};

export interface EmailBlockProps extends InferProps<typeof EmailBlockPropTypes> {
  onSendTest?: () => void;
}

export function EmailBlock({
  description,
  disabled,
  editable,
  emailType,
  hideActions,
  name,
  onSendTest
}: EmailBlockProps) {
  return (
    <Root data-testid={`email-block-${name}`}>
      <Name>{name}</Name>
      <Description>{description}</Description>
      {!hideActions && (
        <Actions>
          <RouterLinkButton
            color="secondary"
            data-testid="edit-button"
            disabled={!!disabled}
            fullWidth
            startIcon={editable ? <EditOutlined /> : <RemoveRedEyeOutlined />}
            to={`/emails/${emailType}/`}
          >
            {editable ? 'View & Edit' : 'View'}
          </RouterLinkButton>
          <SendTestButton color="text" disabled={!onSendTest} fullWidth onClick={onSendTest}>
            Send Test Email
          </SendTestButton>
        </Actions>
      )}
    </Root>
  );
}

EmailBlock.propTypes = EmailBlockPropTypes;
export default EmailBlock;
