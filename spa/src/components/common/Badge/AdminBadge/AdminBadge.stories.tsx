import { Meta, StoryFn } from '@storybook/react';
import AdminBadge from './AdminBadge';

export default {
  component: AdminBadge,
  title: 'Common/Badge/AdminBadge'
} as Meta<typeof AdminBadge>;

const Template: StoryFn<typeof AdminBadge> = () => <AdminBadge />;

export const Default = Template.bind({});
