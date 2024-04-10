import { Meta, StoryObj } from '@storybook/react';
import GlobalLoading from './GlobalLoading';

function GlobalLoadingDemo() {
  return (
    <>
      <GlobalLoading />
      <div style={{ background: 'blue', height: '100vh', width: '100vw' }}></div>
    </>
  );
}

const meta: Meta<typeof GlobalLoadingDemo> = {
  component: GlobalLoadingDemo,
  title: 'Common/GlobalLoading'
};

export default meta;

type Story = StoryObj<typeof GlobalLoading>;

export const Default: Story = {};
