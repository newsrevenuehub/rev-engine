import { ComponentMeta, ComponentStory } from '@storybook/react';

import SubheaderSection from './SubheaderSection';

const args = {
  title: 'Organization',
  subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
};

export default {
  title: 'Common/SubheaderSection',
  component: SubheaderSection
} as ComponentMeta<typeof SubheaderSection>;

export const Default: ComponentStory<typeof SubheaderSection> = SubheaderSection.bind({});

Default.args = {
  ...args
};

export const HideBottomDivider: ComponentStory<typeof SubheaderSection> = SubheaderSection.bind({});

HideBottomDivider.args = {
  ...args,
  hideBottomDivider: true
};
