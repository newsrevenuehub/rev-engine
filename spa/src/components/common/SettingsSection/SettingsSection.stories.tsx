import { Meta, StoryFn } from '@storybook/react';
import CopyInputButton from '../Button/CopyInputButton';

import SettingsSection from './SettingsSection';

export default {
  title: 'Common/SettingsSection',
  component: SettingsSection
} as Meta<typeof SettingsSection>;

export const Default: StoryFn<typeof SettingsSection> = (args) => (
  <SettingsSection {...args}>
    <div style={{ gap: '10px', display: 'flex', flexDirection: 'column' }}>
      <CopyInputButton title="Mock input" link="mock-link" copied="mock-copied" setCopied={() => {}} />
      <CopyInputButton title="Mock input 2" link="mock-link" copied="mock-copied" setCopied={() => {}} />
    </div>
  </SettingsSection>
);

Default.args = {
  orientation: 'horizontal',
  title: 'Organization Tax Status',
  subtitle:
    'The status is used to calculate fees associated with contributions. For non-profits, tax ID (EIN) will be included on contributor receipts.'
};

export const NoBottomDivider: StoryFn<typeof SettingsSection> = (args) => (
  <SettingsSection {...args}>
    <div style={{ gap: '10px', display: 'flex', flexDirection: 'column' }}>
      <CopyInputButton title="Mock input" link="mock-link" copied="mock-copied" setCopied={() => {}} />
    </div>
  </SettingsSection>
);

NoBottomDivider.args = {
  orientation: 'horizontal',
  title: 'Organization Name',
  subtitle: 'This will update the name displayed in the navigation menu.',
  hideBottomDivider: true
};

export const HeaderOnly: StoryFn<typeof SettingsSection> = (args) => <SettingsSection {...args} />;

HeaderOnly.args = {
  orientation: 'horizontal',
  title: 'Details',
  subtitle: 'Update your Organization details and settings here.'
};
