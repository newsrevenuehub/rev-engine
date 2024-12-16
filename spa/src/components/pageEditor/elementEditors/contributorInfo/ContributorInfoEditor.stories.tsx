import { Meta, StoryFn } from '@storybook/react';
import ContributorInfoEditor from './ContributorInfoEditor';

export default {
  component: ContributorInfoEditor,
  title: 'ElementEditors/ContributorInfoEditor'
} as Meta<typeof ContributorInfoEditor>;

const Template: StoryFn<typeof ContributorInfoEditor> = (props) => <ContributorInfoEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  elementContent: { askPhone: true },
  elementRequiredFields: [],
  onChangeElementContent: () => {},
  onChangeElementRequiredFields: () => {}
};
