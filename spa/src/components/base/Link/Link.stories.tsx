import { ComponentMeta, ComponentStory } from '@storybook/react';
import Link from './Link';

export default {
  component: Link,
  title: 'Base/Link'
} as ComponentMeta<typeof Link>;

const Template: ComponentStory<typeof Link> = (props) => (
  <p>
    A paragraph with <Link {...props}>a link</Link> inside it.
  </p>
);

export const Default = Template.bind({});
Default.args = { href: 'https://fundjournalism.org' };
