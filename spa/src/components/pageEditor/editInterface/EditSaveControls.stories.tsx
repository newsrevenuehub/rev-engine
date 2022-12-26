import { ComponentMeta, ComponentStory } from '@storybook/react';
import EditSaveControls from './EditSaveControls';

export default {
  component: EditSaveControls,
  title: 'Page Editor/EditSaveControls'
} as ComponentMeta<typeof EditSaveControls>;

const Template: ComponentStory<typeof EditSaveControls> = (props) => <EditSaveControls {...props} />;

export const Cancel = Template.bind({});

Cancel.args = { variant: 'cancel' };

export const Undo = Template.bind({});

Undo.args = { variant: 'undo' };
