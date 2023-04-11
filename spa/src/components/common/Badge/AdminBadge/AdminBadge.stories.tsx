import { ComponentMeta, ComponentStory } from '@storybook/react';
import AdminBadge from './AdminBadge';

export default {
  component: AdminBadge,
  title: 'Common/Badge/AdminBadge'
} as ComponentMeta<typeof AdminBadge>;

const Template: ComponentStory<typeof AdminBadge> = () => <AdminBadge />;

export const Default = Template.bind({});
