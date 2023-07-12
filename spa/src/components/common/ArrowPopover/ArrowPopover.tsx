import { ClickAwayListener, Fade, Popper, PopperProps } from '@material-ui/core';
import { Close } from '@material-ui/icons';
import { useState } from 'react';
import { Arrow, CloseButton, Content } from './ArrowPopover.styled';

export interface ArrowPopoverProps extends Omit<PopperProps, 'modifiers' | 'placement' | 'transition'> {
  /**
   * Called when the popover is either closed via the close button, or by the
   * user clicking elsewhere on the page.
   */
  onClose: () => void;
  /**
   * Placement of the popover relative to its anchor. Only vertical placements
   * are supported. Defaults to 'bottom'.
   */
  placement?: 'bottom' | 'top';
}

// https://github.com/mui/material-ui/blob/4f2a07e140c954b478a6670c009c23a59ec3e2d4/docs/src/pages/components/popper/ScrollPlayground.js
// was a useful example of how to configure the arrow.
//
// https://v4.mui.com/components/popper/#transitions explains how to transition
// in/out the popper.

export function ArrowPopover({ children, onClose, ...other }: ArrowPopoverProps) {
  const [arrowRef, setArrowRef] = useState<HTMLElement | null>(null);

  // Divs below are because Fade and ClickAwayListener need a single DOM element
  // child to function correctly. React fragments don't work.

  return (
    <Popper
      modifiers={{ arrow: { element: arrowRef, enabled: true }, offset: { enabled: true, offset: '0, 26px' } }}
      transition
      {...other}
    >
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={350}>
          <div>
            <ClickAwayListener onClickAway={onClose}>
              <div>
                <Arrow ref={setArrowRef} />
                <Content>
                  <CloseButton aria-label="Close" onClick={onClose}>
                    <Close />
                  </CloseButton>
                  {children}
                </Content>
              </div>
            </ClickAwayListener>
          </div>
        </Fade>
      )}
    </Popper>
  );
}

export default ArrowPopover;
