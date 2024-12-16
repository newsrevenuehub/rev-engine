import { Meta, StoryFn } from '@storybook/react';
import TokenError from './TokenError';

export default {
  component: TokenError,
  title: 'Contributor/TokenError'
} as Meta<typeof TokenError>;

const Template: StoryFn<typeof TokenError> = () => <TokenError />;

export const Default = Template.bind({});
