import { ComponentMeta, ComponentStory } from '@storybook/react';
import Hero from './Hero';

const args = {
  title: 'Pages',
  subtitle:
    'Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below.',
  placeholder: 'Pages'
};

export default {
  title: 'Common/Hero',
  component: Hero
} as ComponentMeta<typeof Hero>;

export const Default: ComponentStory<typeof Hero> = Hero.bind({});

Default.args = {
  ...args
};

export const ShowExport: ComponentStory<typeof Hero> = Hero.bind({});

ShowExport.args = {
  ...args,
  exportData: {
    transactions: 1234,
    email: 'mock-email@mock.com'
  }
};

export const NoSearch: ComponentStory<typeof Hero> = Hero.bind({});

NoSearch.args = {
  ...args,
  onChange: undefined
};
