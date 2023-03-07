import { ComponentMeta, ComponentStory } from '@storybook/react';
import CopyInputButton from '../Button/CopyInputButton';

import SettingsSection from './SettingsSection';

export default {
  title: 'Common/SettingsSection',
  component: SettingsSection
} as ComponentMeta<typeof SettingsSection>;

export const Default: ComponentStory<typeof SettingsSection> = (args) => (
  <SettingsSection {...args}>
    <div style={{ gap: '10px', display: 'flex', flexDirection: 'column' }}>
      <CopyInputButton title="Mock input" link="mock-link" copied="mock-copied" setCopied={() => {}} />
      <CopyInputButton title="Mock input 2" link="mock-link" copied="mock-copied" setCopied={() => {}} />
    </div>
  </SettingsSection>
);

Default.args = {
  title: 'Organization Tax Status',
  subtitle:
    'The status is used to calculate fees associated with contributions. For non-profits, tax ID (EIN) will be included on contributor receipts.'
};

export const NoBottomDivider: ComponentStory<typeof SettingsSection> = (args) => (
  <SettingsSection {...args}>
    <div style={{ gap: '10px', display: 'flex', flexDirection: 'column' }}>
      <CopyInputButton title="Mock input" link="mock-link" copied="mock-copied" setCopied={() => {}} />
    </div>
  </SettingsSection>
);

NoBottomDivider.args = {
  title: 'Organization Name',
  subtitle: 'This will update the name displayed in the navigation menu.',
  hideBottomDivider: true
};

export const LeftOnly: ComponentStory<typeof SettingsSection> = (args) => <SettingsSection {...args} />;

LeftOnly.args = {
  title: 'Details',
  subtitle: 'Update your Organization details and settings here.'
};
