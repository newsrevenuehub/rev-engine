import { Meta, StoryObj } from '@storybook/react';
import EmailRichTextEditor from './EmailRichTextEditor';

const meta: Meta<typeof EmailRichTextEditor> = {
  component: EmailRichTextEditor,
  title: 'Common/EmailRichTextEditor'
};

export default meta;

type Story = StoryObj<typeof EmailRichTextEditor>;

export const Default: Story = {};
Default.args = {
  initialValue: '<p>Hello world.</p><p>This is a second paragraph.</p>'
};
