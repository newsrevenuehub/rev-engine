import HeaderSection from './HeaderSection';

const args = {
  title: 'Pages',
  subtitle: (
    <p>
      Welcome to Pages. Here you can create, manage, and publish contribution pages. Create a<br /> new page by
      selecting the ‘New Page’ button below.
    </p>
  )
};

export default {
  title: 'Common/HeaderSection',
  component: HeaderSection
};

export const Default = HeaderSection.bind({});

Default.args = {
  ...args
};
