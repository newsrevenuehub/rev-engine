import { useState } from 'react';
import { ButtonBase, ClickAwayListener } from '@material-ui/core';
import { Meta, Story } from '@storybook/react';
import Tooltip, { TooltipProps } from './Tooltip';
import { InfoOutlined } from '@material-ui/icons';

const TooltipDemo = (props: TooltipProps) => (
  <Tooltip {...props}>
    <span>Tooltip Anchor</span>
  </Tooltip>
);

const ClickTooltipDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <span>
          <Tooltip
            disableFocusListener
            disableHoverListener
            disableTouchListener
            onClose={() => setOpen(false)}
            open={open}
            PopperProps={{
              disablePortal: true
            }}
            title="Hello World"
          >
            <ButtonBase aria-label="Help" disableRipple disableTouchRipple onClick={() => setOpen(true)}>
              <InfoOutlined />
            </ButtonBase>
          </Tooltip>
        </span>
      </ClickAwayListener>
    </>
  );
};

export default {
  component: TooltipDemo,
  title: 'Base/Tooltip',
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based tooltip. See [the API](https://v4.mui.com/api/tooltip/) for more details.'
      }
    }
  }
} as Meta;

export const Static: Story<TooltipProps> = TooltipDemo.bind({});
Static.args = { title: 'Hello World', open: true };

export const Clickable: Story = ClickTooltipDemo.bind({});
