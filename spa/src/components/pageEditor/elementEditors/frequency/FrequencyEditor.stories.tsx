import { Meta, StoryFn } from '@storybook/react';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import FrequencyEditor from './FrequencyEditor';

export default {
  component: FrequencyEditor,
  title: 'ElementEditors/FrequencyEditor'
} as Meta<typeof FrequencyEditor>;

const Template: StoryFn<typeof FrequencyEditor> = (props) => <FrequencyEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  elementContent: [
    { value: CONTRIBUTION_INTERVALS.ONE_TIME },
    { value: CONTRIBUTION_INTERVALS.MONTHLY, isDefault: true },
    { value: CONTRIBUTION_INTERVALS.ANNUAL }
  ],
  onChangeElementContent: () => {},
  setUpdateDisabled: () => {}
};

export const NoDefaultSet = Template.bind({});
NoDefaultSet.args = {
  elementContent: [
    { value: CONTRIBUTION_INTERVALS.ONE_TIME },
    { value: CONTRIBUTION_INTERVALS.MONTHLY },
    { value: CONTRIBUTION_INTERVALS.ANNUAL }
  ],
  onChangeElementContent: () => {},
  setUpdateDisabled: () => {}
};

export const NoFrequenciesEnabled = Template.bind({});
NoFrequenciesEnabled.args = {
  elementContent: [],
  onChangeElementContent: () => {},
  setUpdateDisabled: () => {}
};
