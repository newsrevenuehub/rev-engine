import { Meta, StoryObj } from '@storybook/react';
import ImageEditor from './ImageEditor';

const meta: Meta<typeof ImageEditor> = {
  component: ImageEditor,
  title: 'ElementEditors/ImageEditor'
};

export default meta;

type Story = StoryObj<typeof ImageEditor>;

export const Default: Story = {};
