import { Meta, StoryFn } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import BackButton from './BackButton';

export default {
  component: BackButton,
  title: 'Page Editor/BackButton'
} as Meta<typeof BackButton>;

const Template: StoryFn<typeof BackButton> = (props) => (
  <MemoryRouter>
    <div style={{ background: 'blue' }}>
      <BackButton {...props} />
    </div>
  </MemoryRouter>
);

export const Default = Template.bind({});
export const ConfirmNavigation = Template.bind({});

ConfirmNavigation.args = { confirmNavigation: true };
