import { ComponentMeta, ComponentStory } from '@storybook/react';
import { Button } from 'components/base';
import { useState } from 'react';
import PublishedPopover from './PublishedPopover';

export default {
  component: PublishedPopover,
  title: 'Common/Modal/PublishedPopover'
} as ComponentMeta<typeof PublishedPopover>;

const Template: ComponentStory<typeof PublishedPopover> = (props) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button onClick={(event) => setAnchorEl(event.target as HTMLElement)}>Show Popover</Button>
      <PublishedPopover {...props} anchorEl={anchorEl} open={!!anchorEl} />
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  page: {
    published_date: new Date('January 1, 2000'),
    revenue_program: {
      slug: 'rp-slug'
    },
    slug: 'test-page-slug'
  } as any
};
