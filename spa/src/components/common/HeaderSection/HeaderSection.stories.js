import HeaderSection from './HeaderSection';

const args = {
  title: 'Pages',
  subtitle:
    'Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a new page by selecting the ‘New Page’ button below.'
};

export default {
  title: 'Common/HeaderSection',
  component: HeaderSection
};

export const Default = HeaderSection.bind({});

Default.args = {
  ...args
};
