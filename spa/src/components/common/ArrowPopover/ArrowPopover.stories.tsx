import { Meta, StoryFn } from '@storybook/react';
import { MouseEvent, useState } from 'react';
import ArrowPopover from './ArrowPopover';

export default {
  component: ArrowPopover,
  title: 'Common/ArrowPopover'
} as Meta<typeof ArrowPopover>;

const Template: StoryFn<typeof ArrowPopover> = (props) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function handleClick(event: MouseEvent) {
    if (anchorEl) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.target as HTMLElement);
    }
  }

  return (
    <>
      <button onClick={handleClick} style={{ marginTop: 200 }}>
        Anchor
      </button>
      <ArrowPopover anchorEl={anchorEl} {...props} onClose={() => setAnchorEl(null)} open={!!anchorEl}>
        This is the popover content.
      </ArrowPopover>
    </>
  );
};

export const Default = Template.bind({});
export const Flipped = Template.bind({});
Flipped.args = {
  placement: 'top'
};
