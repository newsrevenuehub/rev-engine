import { Meta, StoryFn } from '@storybook/react';
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
} as Meta<typeof Hero>;

export const Default: StoryFn<typeof Hero> = Hero.bind({});

Default.args = {
  ...args
};

export const ShowExport: StoryFn<typeof Hero> = Hero.bind({});

ShowExport.args = {
  ...args,
  exportData: {
    transactions: 1234,
    email: 'mock-email@mock.com'
  }
};

export const ShowExportWithZeroTransactions: StoryFn<typeof Hero> = Hero.bind({});

ShowExportWithZeroTransactions.args = {
  ...args,
  exportData: {
    transactions: 0,
    email: 'mock-email@mock.com'
  }
};

export const NoSearch: StoryFn<typeof Hero> = Hero.bind({});

NoSearch.args = {
  ...args,
  onChange: undefined
};
