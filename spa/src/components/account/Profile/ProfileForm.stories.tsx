import { Meta, Story } from '@storybook/react';
import ProfileForm from './ProfileForm';

export default {
  component: ProfileForm,
  title: 'Profile/ProfileForm'
} as Meta;

export const Default: Story<{ onProfileSubmit: () => void; disabled: boolean }> = ProfileForm.bind({});
