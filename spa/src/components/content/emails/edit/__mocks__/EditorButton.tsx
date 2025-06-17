import { EditorButtonProps } from '../EditorButton';

export const EditorButton = ({ isActive, ariaLabel, editor, children, onClick }: EditorButtonProps) => (
  <button
    aria-label={ariaLabel!}
    data-active={isActive && editor && isActive(editor!)}
    onClick={() => editor && onClick(editor)}
    data-testid={`mock-editor-button-${ariaLabel}`}
  >
    {children}
  </button>
);

export default EditorButton;
