import { Meta, StoryObj } from '@storybook/react';
import Menu from './Menu';
import Button from '../Button/Button';
import { useState } from 'react';
import MenuItem from '../MenuItem/MenuItem';

const MenuDemo = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <Button
        color="secondary"
        aria-controls="test-menu"
        aria-pressed={!!anchorEl}
        onClick={({ currentTarget }) => setAnchorEl(currentTarget)}
        ref={setAnchorEl}
      >
        Anchor Button
      </Button>
      <Menu anchorEl={anchorEl} id="test-menu" onClose={() => setAnchorEl(null)} open={!!anchorEl}>
        <MenuItem>Enabled Item 1</MenuItem>
        <MenuItem>Enabled Item 2</MenuItem>
        <MenuItem disabled>Disabled Item</MenuItem>
      </Menu>
    </>
  );
};

const meta: Meta<typeof MenuDemo> = {
  component: MenuDemo,
  title: 'Base/Menu'
};

export default meta;

type Story = StoryObj<typeof MenuDemo>;

export const Default: Story = {};
