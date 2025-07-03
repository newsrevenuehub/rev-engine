import { forwardRef } from 'react';
import { DiscardChangesButtonProps } from '../DiscardChangesButton';

export const DiscardChangesButton = forwardRef<HTMLButtonElement, DiscardChangesButtonProps>((props, ref) => (
  <button
    aria-label={props['aria-label']}
    data-testid="mock-discard-changes-button"
    data-changes-pending={props.changesPending}
    onClick={props.onDiscard}
    ref={ref}
  >
    {props.children}
  </button>
));
