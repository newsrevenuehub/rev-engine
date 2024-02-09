import { Meta, StoryObj } from '@storybook/react';
import Banner from './Banner';

const BannerDemo = (contribution: any) => <Banner contribution={contribution} />;

const meta: Meta<typeof BannerDemo> = {
  component: BannerDemo,
  title: 'Contributor/Banner'
};

export default meta;

type Story = StoryObj<typeof BannerDemo>;

export const Default: Story = {};
Default.args = {
  status: 'canceled'
};
