import { ComponentMeta, ComponentStory } from '@storybook/react';
import SearchableSelect from './SearchableSelect';

export default {
  title: 'Base/Select/SearchableSelect',
  component: SearchableSelect
} as ComponentMeta<typeof SearchableSelect>;

const Template: ComponentStory<typeof SearchableSelect> = (args: any) => (
  <SearchableSelect
    label="Color"
    getOptionLabel={({ label }: { label: string }) => label}
    options={[{ label: 'Red' }, { label: 'Green' }, { label: 'Blue' }]}
    {...args}
  />
);

export const Default = Template.bind({});

export const WithError = Template.bind({});
WithError.args = {
  error: true,
  helperText: 'This is an error message'
};
