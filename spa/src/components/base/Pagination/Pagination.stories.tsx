import { Meta, StoryFn } from '@storybook/react';
import Pagination from './Pagination';
export default {
  args: {
    count: 5,
    page: 2
  },
  argTypes: {
    count: { control: 'number' },
    page: { control: 'number' }
  },
  component: Pagination,
  title: 'Base/Pagination'
} as Meta<typeof Pagination>;

const Template: StoryFn<typeof Pagination> = (props) => <Pagination {...props} />;

export const Default = Template.bind({});
