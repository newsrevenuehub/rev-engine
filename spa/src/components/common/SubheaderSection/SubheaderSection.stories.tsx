import { Meta, StoryFn } from '@storybook/react';

import SubheaderSection from './SubheaderSection';

const args = {
  title: 'Organization',
  subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
};

export default {
  title: 'Common/SubheaderSection',
  component: SubheaderSection
} as Meta<typeof SubheaderSection>;

export const Default: StoryFn<typeof SubheaderSection> = SubheaderSection.bind({});

Default.args = {
  ...args
};

export const HideBottomDivider: StoryFn<typeof SubheaderSection> = SubheaderSection.bind({});

HideBottomDivider.args = {
  ...args,
  hideBottomDivider: true
};
