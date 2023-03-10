import { PublishedPopoverProps } from '../PublishedPopover';

export const PublishedPopover = ({ onClose, open }: PublishedPopoverProps) => (
  <>
    {open && (
      <div data-testid="mock-published-popover">
        <button onClick={onClose}>PublishedPopover onClose</button>
      </div>
    )}
  </>
);

export default PublishedPopover;
