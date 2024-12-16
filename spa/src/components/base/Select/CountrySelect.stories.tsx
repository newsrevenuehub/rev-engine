import { Meta, StoryFn } from '@storybook/react';
import CountrySelect from './CountrySelect';

export default {
  title: 'Base/Select/CountrySelect',
  component: CountrySelect
} as Meta<typeof CountrySelect>;

const Template: StoryFn<typeof CountrySelect> = (args: any) => <CountrySelect {...args} />;

export const Default = Template.bind({ name: 'Test Label' });
