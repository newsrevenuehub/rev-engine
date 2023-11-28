import { ComponentMeta, ComponentStory } from '@storybook/react';
import TokenError from './TokenError';

export default {
  component: TokenError,
  title: 'Contributor/TokenError'
} as ComponentMeta<typeof TokenError>;

const Template: ComponentStory<typeof TokenError> = () => <TokenError />;

export const Default = Template.bind({});
