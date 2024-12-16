import { ButtonBase, ClickAwayListener } from '@material-ui/core';
import { InfoOutlined } from '@material-ui/icons';
import { StoryFn } from '@storybook/react';
import { useState } from 'react';
import Tooltip from './Tooltip';

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
  component: Tooltip,
  title: 'Base/Tooltip',
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based tooltip. See [the API](https://v4.mui.com/api/tooltip/) for more details.'
      }
    }
  }
};

const TooltipTemplate: StoryFn<typeof Tooltip> = (props) => (
  <Tooltip {...props}>
    <span style={{ background: 'lightgray', position: 'relative', top: 100, left: 100 }}>Tooltip Anchor</span>
  </Tooltip>
);

const ClickTooltipTemplate: StoryFn<typeof Tooltip> = (props) => {
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

export const Static = TooltipTemplate.bind({});
Static.args = { title: 'Hello World', open: true, placement: 'bottom' };

export const Clickable = ClickTooltipTemplate.bind({});
