import { ComponentMeta, ComponentStory } from '@storybook/react';
import ContributorInfoEditor from './ContributorInfoEditor';

export default {
  component: ContributorInfoEditor,
  title: 'ElementEditors/ContributorInfoEditor'
} as ComponentMeta<typeof ContributorInfoEditor>;

const Template: ComponentStory<typeof ContributorInfoEditor> = (props) => <ContributorInfoEditor {...props} />;

export const Default = Template.bind({});
Default.args = {
  elementContent: { askPhone: true },
  elementRequiredFields: [],
  onChangeElementContent: () => {},
  onChangeElementRequiredFields: () => {}
};
