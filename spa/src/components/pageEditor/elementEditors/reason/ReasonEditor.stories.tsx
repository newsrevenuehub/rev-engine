import { Meta, StoryFn } from '@storybook/react';
import ReasonEditor from './ReasonEditor';

export default {
  component: ReasonEditor,
  title: 'ElementEditors/ReasonEditor'
} as Meta<typeof ReasonEditor>;

const Template: StoryFn<typeof ReasonEditor> = (props) => <ReasonEditor {...props} />;

export const Empty = Template.bind({});
Empty.args = {
  elementContent: { reasons: [] },
  setUpdateDisabled: () => {}
};

export const ReasonRequired = Template.bind({});
ReasonRequired.args = {
  elementContent: { askReason: true, reasons: [] },
  elementRequiredFields: ['reason_for_giving'],
  setUpdateDisabled: () => {}
};
