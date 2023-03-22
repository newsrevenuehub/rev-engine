import { AddPageModalProps } from '../AddPageModal';

export const AddPageModal = ({ onAddPage, outerError }: AddPageModalProps) => (
  <div data-testid="mock-add-page-modal">
    <button onClick={() => onAddPage(1)}>onAddPage</button>
    <div data-testid="outerError">{outerError}</div>
  </div>
);

export default AddPageModal;
