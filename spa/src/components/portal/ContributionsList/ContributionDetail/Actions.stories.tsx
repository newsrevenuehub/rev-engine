import { Meta, StoryObj } from '@storybook/react';
import Actions from './Actions';

const ActionsDemo = (contribution: any) => (
  <Actions contribution={contribution} cancelContribution={() => console.log('cancel contribution')} />
);

const meta: Meta<typeof ActionsDemo> = {
  component: ActionsDemo,
  title: 'Contributor/Actions'
};

export default meta;

type Story = StoryObj<typeof ActionsDemo>;

export const Default: Story = {};
Default.args = {
  is_cancelable: true
};
