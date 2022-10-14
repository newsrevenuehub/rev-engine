import { ButtonBase, ClickAwayListener } from '@material-ui/core';
import { InfoOutlined } from '@material-ui/icons';
import { useState } from 'react';
import Tooltip from './Tooltip';

const TooltipDemo = (props) => (
  <Tooltip {...props}>
    <span>Tooltip Anchor</span>
  </Tooltip>
);

const ClickTooltipDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <span>
        <Tooltip
          disableFocusListener
          disableHoverListener
          disableTouchListener
          onClose={() => setOpen(false)}
          open={open}
          title="Hello World"
        >
          <ButtonBase aria-label="Help" disableRipple disableTouchRipple onClick={() => setOpen(true)}>
            <InfoOutlined />
          </ButtonBase>
        </Tooltip>
      </span>
    </ClickAwayListener>
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
};

export const Static = TooltipDemo.bind({});
Static.args = { title: 'Hello World', open: true };

export const Clickable = ClickTooltipDemo.bind({});
