import { ComponentMeta, ComponentStory } from '@storybook/react';

import OrganizationMenu from './OrganizationMenu';

export default {
  title: 'Common/OrganizationMenu',
  component: OrganizationMenu
} as ComponentMeta<typeof OrganizationMenu>;

export const Default: ComponentStory<typeof OrganizationMenu> = (args) => (
  <div style={{ width: '100%', backgroundColor: '#25192B', padding: 20 }}>
    <OrganizationMenu {...args} />
  </div>
);

Default.args = {
  title: 'RP Name'
};
