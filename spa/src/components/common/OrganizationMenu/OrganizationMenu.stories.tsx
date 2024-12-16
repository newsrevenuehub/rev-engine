import { Meta, StoryFn } from '@storybook/react';

import OrganizationMenu from './OrganizationMenu';

export default {
  title: 'Common/OrganizationMenu',
  component: OrganizationMenu
} as Meta<typeof OrganizationMenu>;

export const Default: StoryFn<typeof OrganizationMenu> = (args) => (
  <div style={{ width: '100%', backgroundColor: '#25192B', padding: 20 }}>
    <OrganizationMenu {...args} />
  </div>
);

Default.args = {
  title: 'RP Name'
};
