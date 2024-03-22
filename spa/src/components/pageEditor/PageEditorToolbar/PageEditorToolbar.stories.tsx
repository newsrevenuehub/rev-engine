import { Meta, StoryObj } from '@storybook/react';
import PageEditorToolbar from './PageEditorToolbar';

const meta: Meta<typeof PageEditorToolbar> = {
  component: PageEditorToolbar,
  title: 'Page Editor/PageEditorToolbar'
};

export default meta;

type Story = StoryObj<typeof PageEditorToolbar>;

export const Default: Story = {};

export const PreviewSelected: Story = {};
PreviewSelected.args = { selected: 'preview' };

export const EditSelected: Story = {};
EditSelected.args = { selected: 'edit' };

export const SaveDisabled: Story = {};
SaveDisabled.args = { saveDisabled: true };
