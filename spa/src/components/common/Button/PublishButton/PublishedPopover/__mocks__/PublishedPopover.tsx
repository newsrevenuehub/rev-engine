import { PublishedPopoverProps } from '../PublishedPopover';

export const PublishedPopover = ({ onClose, onUnpublish, open }: PublishedPopoverProps) => (
  <>
    {open && (
      <div data-testid="mock-published-popover">
        <button onClick={onClose}>PublishedPopover onClose</button>
        <button onClick={onUnpublish}>PublishedPopover onUnpublish</button>
      </div>
    )}
  </>
);

export default PublishedPopover;
