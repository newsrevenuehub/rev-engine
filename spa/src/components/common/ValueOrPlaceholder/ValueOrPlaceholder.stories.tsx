import { ComponentMeta, ComponentStory } from '@storybook/react';
import ValueOrPlaceholder from './ValueOrPlaceholder';

export default {
  component: ValueOrPlaceholder,
  title: 'Common/ValueOrPlaceholder'
} as ComponentMeta<typeof ValueOrPlaceholder>;

const Template: ComponentStory<typeof ValueOrPlaceholder> = (props) => (
  <>
    <p>
      Change the <strong>value</strong> prop to see the result below.
    </p>
    <ValueOrPlaceholder {...props}>Children are shown</ValueOrPlaceholder>
  </>
);

export const Default = Template.bind({});
