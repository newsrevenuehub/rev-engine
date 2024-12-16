import { Meta, StoryFn } from '@storybook/react';
import Searchbar from './Searchbar';

export default {
  title: 'Common/Searchbar',
  component: Searchbar
} as Meta<typeof Searchbar>;

export const Default: StoryFn<typeof Searchbar> = Searchbar.bind({});

Default.args = {
  placeholder: 'Pages'
};
