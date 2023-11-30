import { ComponentMeta, ComponentStory } from '@storybook/react';
import PublishModal from './PublishModal';

// @ts-expect-error Unclear why Storybook has problems with this specific
// component, but it's related to the page property.
export default {
  component: PublishModal,
  title: 'Common/Button/PublishButton/PublishModal'
} as ComponentMeta<typeof PublishModal>;

const Template: ComponentStory<typeof PublishModal> = (props) => <PublishModal {...props} />;

export const Default = Template.bind({});
Default.args = {
  open: true,
  page: { id: 'mock-id', name: 'Page Name', revenue_program: { slug: 'my-rp' } } as any
};

export const WithSlugError = Template.bind({});
WithSlugError.args = {
  ...Default.args,
  page: { ...Default.args.page, slug: 'this-slug-is-not-unique' } as any,
  slugError: ['Ensure this field has no more than 50 characters.']
};
