import { Meta, StoryFn } from '@storybook/react';
import EditSaveControls from './EditSaveControls';

export default {
  component: EditSaveControls,
  title: 'Page Editor/EditSaveControls'
} as Meta<typeof EditSaveControls>;

const Template: StoryFn<typeof EditSaveControls> = (props) => <EditSaveControls {...props} />;

export const Cancel = Template.bind({});

Cancel.args = { variant: 'cancel' };

export const Undo = Template.bind({});

Undo.args = { variant: 'undo' };
