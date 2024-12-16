import { Meta, StoryFn } from '@storybook/react';
import Link from './Link';

export default {
  component: Link,
  title: 'Base/Link'
} as Meta<typeof Link>;

const Template: StoryFn<typeof Link> = (props) => (
  <p>
    A paragraph with <Link {...props}>a link</Link> inside it.
  </p>
);

export const Default = Template.bind({});
Default.args = { href: 'https://fundjournalism.org' };

export const External = Template.bind({});
External.args = { external: true, href: 'https://fundjournalism.org' };
