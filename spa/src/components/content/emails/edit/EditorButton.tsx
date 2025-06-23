import { Editor } from '@tiptap/react';
import PropTypes, { InferProps } from 'prop-types';
import { Button } from './EditorButton.styled';

const EditorButtonPropTypes = {
  ariaLabel: PropTypes.string,
  children: PropTypes.node.isRequired,
  editor: PropTypes.object,
  isActive: PropTypes.func,
  isDisabled: PropTypes.func,
  onClick: PropTypes.func.isRequired
};

export interface EditorButtonProps extends InferProps<typeof EditorButtonPropTypes> {
  editor: Editor | null;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  onClick: (editor: Editor) => void;
}

export function EditorButton({ ariaLabel, children, editor, isActive, isDisabled, onClick }: EditorButtonProps) {
  return (
    <Button
      aria-label={ariaLabel ?? undefined}
      aria-pressed={!!(isActive && editor && isActive(editor))}
      disabled={!!(!editor || (isDisabled && isDisabled(editor)))}
      onClick={() => editor && onClick(editor)}
      color="text"
    >
      {children}
    </Button>
  );
}

EditorButton.propTypes = EditorButtonPropTypes;
export default EditorButton;
