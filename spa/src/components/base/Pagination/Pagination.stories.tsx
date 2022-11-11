import { ComponentMeta, ComponentStory } from '@storybook/react';
import Pagination from './Pagination';
export default {
  argTypes: {
    count: { control: 'number', defaultValue: 5 },
    page: { control: 'number', defaultValue: 2 }
  },
  component: Pagination,
  title: 'Base/Pagination'
} as ComponentMeta<typeof Pagination>;

const Template: ComponentStory<typeof Pagination> = (props) => <Pagination {...props} />;

export const Default = Template.bind({});
