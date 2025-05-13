import { ResetContentButtonProps } from '../ResetContentButton';

export const ResetContentButton = ({ defaultContent, editor }: ResetContentButtonProps) => (
  <button
    data-testid="mock-reset-content-button"
    data-default-content={defaultContent()}
    data-editor={JSON.stringify(editor)}
  >
    Reset Content
  </button>
);

export default ResetContentButton;
