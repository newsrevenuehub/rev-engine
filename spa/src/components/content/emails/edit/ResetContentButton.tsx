import { Editor } from '@tiptap/react';
import PropTypes, { InferProps } from 'prop-types';
import { Button } from './ResetContentButton.styled';

const ResetContentButtonPropTypes = {
  defaultContent: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  editor: PropTypes.object
};

export interface ResetContentButtonProps extends InferProps<typeof ResetContentButtonPropTypes> {
  defaultContent: () => string;
  editor: Editor | null;
}

export function ResetContentButton({ defaultContent, disabled, editor }: ResetContentButtonProps) {
  function handleClick() {
    if (!editor) {
      // Should never happen.
      throw new Error('editor is undefined');
    }

    // Force an update event.

    editor.commands.setContent(defaultContent(), true);
  }

  return (
    <Button disabled={disabled || !editor} onClick={handleClick}>
      Reset to Default Copy
    </Button>
  );
}

ResetContentButton.propTypes = ResetContentButtonPropTypes;
export default ResetContentButton;
