import { ButtonBase, ClickAwayListener } from '@material-ui/core';
import { InfoOutlined } from '@material-ui/icons';
import { useState } from 'react';
import Tooltip from './Tooltip';

const TooltipDemo = (props) => (
  <Tooltip {...props}>
    <span style={{ background: 'lightgray', position: 'relative', top: 100, left: 100 }}>Tooltip Anchor</span>
  </Tooltip>
);

const ClickTooltipDemo = (props) => {
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
          {...props}
        >
          <ButtonBase
            aria-label="Help"
            disableRipple
            disableTouchRipple
            onClick={() => setOpen((value) => !value)}
            style={{ marginLeft: 100, marginTop: 100 }}
          >
            <InfoOutlined />
          </ButtonBase>
        </Tooltip>
      </span>
    </ClickAwayListener>
  );
};

export default {
  argTypes: {
    placement: {
      control: { type: 'select' },
      options: [
        'bottom-end',
        'bottom-start',
        'bottom',
        'left-end',
        'left-start',
        'left',
        'right-end',
        'right-start',
        'right',
        'top-end',
        'top-start',
        'top'
      ]
    }
  },
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
Static.args = { title: 'Hello World', open: true, placement: 'bottom' };

export const Clickable = ClickTooltipDemo.bind({});
