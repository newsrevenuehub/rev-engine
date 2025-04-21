import PropTypes, { InferProps } from 'prop-types';
import { Actions, Description, Name, Root, SendTestButton } from './EmailBlock.styled';
import { Button, Link } from 'components/base';
import { EditOutlined, RemoveRedEyeOutlined } from '@material-ui/icons';

const EmailBlockPropTypes = {
  description: PropTypes.string.isRequired,
  editable: PropTypes.bool,
  name: PropTypes.string.isRequired,
  previewUrl: PropTypes.string,
  onSendTest: PropTypes.func
};

export interface EmailBlockProps extends InferProps<typeof EmailBlockPropTypes> {
  onSendTest?: () => void;
}

export function EmailBlock({ description, editable, name, previewUrl, onSendTest }: EmailBlockProps) {
  return (
    <Root data-testid={`email-block-${name}`}>
      <Name>{name}</Name>
      <Description>
        {description}
        {previewUrl && (
          <>
            {' '}
            <Link href={previewUrl} target="_blank">
              See Preview
            </Link>
          </>
        )}
      </Description>
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
    </Root>
  );
}

EmailBlock.propTypes = EmailBlockPropTypes;
export default EmailBlock;
