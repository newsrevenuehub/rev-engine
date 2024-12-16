import { Meta, StoryFn } from '@storybook/react';
import ValueOrPlaceholder from './ValueOrPlaceholder';

export default {
  component: ValueOrPlaceholder,
  title: 'Common/ValueOrPlaceholder'
} as Meta<typeof ValueOrPlaceholder>;

const Template: StoryFn<typeof ValueOrPlaceholder> = (props) => (
  <>
    <p>
      Change the <strong>value</strong> prop to see the result below.
    </p>
    <ValueOrPlaceholder {...props}>Children are shown</ValueOrPlaceholder>
  </>
);

export const Default = Template.bind({});
