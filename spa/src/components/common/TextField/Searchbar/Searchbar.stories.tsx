import { ComponentMeta, ComponentStory } from '@storybook/react';
import Searchbar from './Searchbar';

export default {
  title: 'Common/Searchbar',
  component: Searchbar
} as ComponentMeta<typeof Searchbar>;

export const Default: ComponentStory<typeof Searchbar> = Searchbar.bind({});

Default.args = {
  placeholder: 'Pages'
};
