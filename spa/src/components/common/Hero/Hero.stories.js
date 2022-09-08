import Hero from './Hero';

const args = {
  title: 'Pages',
  subtitle:
    'Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below.',
  searchPlaceholder: 'Pages'
};

export default {
  title: 'Common/Hero',
  component: Hero
};

export const Default = Hero.bind({});

Default.args = {
  ...args
};
