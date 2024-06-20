import { Meta, StoryFn } from '@storybook/react';
import { Popover } from './Popover';
import React from 'react';

export default {
  component: Popover,
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based Popover. See [the API](https://v4.mui.com/api/popover/) for more details.'
      }
    }
  },
  title: 'Base/Popover'
} as Meta<typeof Popover>;

const Template: StoryFn<typeof Popover> = (props) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  return (
    <>
      <button onClick={handleClick}>click me</button>
      <Popover open={open} onClose={() => setOpen(false)} anchorEl={anchorEl} {...props}>
        <div style={{ padding: '20px' }}>
          <h3>Popover content</h3>
          <p>This is the content of the popover</p>
        </div>
      </Popover>
    </>
  );
};

export const Default = Template.bind({});
