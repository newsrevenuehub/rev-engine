import PropTypes, { InferProps } from 'prop-types';
import { Actions, Description, Name, Root, SendTestButton } from './EmailBlock.styled';
import { Button } from 'components/base';
import { EditOutlined, RemoveRedEyeOutlined } from '@material-ui/icons';

const EmailBlockPropTypes = {
  description: PropTypes.node.isRequired,
  editable: PropTypes.bool,
  hideActions: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onSendTest: PropTypes.func
};

export interface EmailBlockProps extends InferProps<typeof EmailBlockPropTypes> {
  onSendTest?: () => void;
}

export function EmailBlock({ description, editable, hideActions, name, onSendTest }: EmailBlockProps) {
  return (
    <Root data-testid={`email-block-${name}`}>
      <Name>{name}</Name>
      <Description>{description}</Description>
      {!hideActions && (
        <Actions>
          <Button
            color="secondary"
            data-testid="edit-button"
            disabled
            fullWidth
            startIcon={editable ? <EditOutlined /> : <RemoveRedEyeOutlined />}
          >
            {editable ? 'View & Edit' : 'View'}
          </Button>
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
