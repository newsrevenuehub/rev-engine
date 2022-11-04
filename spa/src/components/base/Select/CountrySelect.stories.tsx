import { ComponentMeta, ComponentStory } from '@storybook/react';
import CountrySelect from './CountrySelect';

export default {
  title: 'Base/Select/CountrySelect',
  component: CountrySelect
} as ComponentMeta<typeof CountrySelect>;

const Template: ComponentStory<typeof CountrySelect> = (args: any) => <CountrySelect {...args} />;

export const Default = Template.bind({ name: 'Test Label' });
