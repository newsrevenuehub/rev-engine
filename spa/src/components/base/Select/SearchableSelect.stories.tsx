import { Meta, StoryFn } from '@storybook/react';
import SearchableSelect from './SearchableSelect';

export default {
  title: 'Base/Select/SearchableSelect',
  component: SearchableSelect
} as Meta<typeof SearchableSelect>;

const Template: StoryFn<typeof SearchableSelect> = (args: any) => (
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
