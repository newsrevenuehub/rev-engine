import { Meta, StoryFn } from '@storybook/react';
import MobileInfoMenu from './MobileInfoMenu';

export default {
  component: MobileInfoMenu,
  title: 'Contributor/MobileInfoMenu'
} as Meta<typeof MobileInfoMenu>;

const Template: StoryFn<typeof MobileInfoMenu> = (props) => (
  <div style={{ marginTop: 250, marginLeft: 400 }}>
    <MobileInfoMenu {...props} />
  </div>
);

export const Default = Template.bind({});
Default.args = {
  revenueProgram: {
    contact_email: 'revengine@fundjournalism.org',
    contact_phone: '+1 (415) 555-2671',
    contributor_portal_show_appeal: true
  } as any
};

export const HideAppeal = Template.bind({});
HideAppeal.args = {
  revenueProgram: {
    contact_email: 'revengine@fundjournalism.org',
    contact_phone: '+1 (415) 555-2671',
    contributor_portal_show_appeal: false
  } as any
};
