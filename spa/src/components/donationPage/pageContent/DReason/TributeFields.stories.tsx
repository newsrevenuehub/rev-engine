import { Meta, StoryObj } from '@storybook/react';
import TributeFields from './TributeFields';

const meta: Meta<typeof TributeFields> = {
  component: TributeFields,
  title: 'Donation Page/TributeFields'
};

export default meta;

type Story = StoryObj<typeof TributeFields>;

export const HonoreeOnly: Story = {};
HonoreeOnly.args = {
  askHonoree: true
};

export const HonoreeOnlyError: Story = {};
HonoreeOnlyError.args = {
  askHonoree: true,
  error: 'Error messsage',
  tributeType: 'honoree',
  tributeName: 'Jane Doe'
};

export const HonoreeOnlyWithValue: Story = {};
HonoreeOnlyWithValue.args = {
  askHonoree: true,
  tributeType: 'honoree',
  tributeName: 'Jane Doe'
};

export const InMemoryOfOnly: Story = {};
InMemoryOfOnly.args = {
  askInMemoryOf: true
};

export const InMemoryOfOnlyError: Story = {};
InMemoryOfOnlyError.args = {
  askInMemoryOf: true,
  error: 'Error messsage',
  tributeType: 'inMemoryOf',
  tributeName: 'Jane Doe'
};

export const InMemoryOfOnlyWithValue: Story = {};
InMemoryOfOnlyWithValue.args = {
  askInMemoryOf: true,
  tributeType: 'inMemoryOf',
  tributeName: 'Jane Doe'
};

export const MultipleTypes: Story = {};
MultipleTypes.args = {
  askHonoree: true,
  askInMemoryOf: true
};

export const MultipleTypesWithValue: Story = {};
MultipleTypesWithValue.args = {
  askHonoree: true,
  askInMemoryOf: true,
  tributeType: 'inMemoryOf',
  tributeName: 'Jane Doe'
};

export const MultipleTypesWithValueError: Story = {};
MultipleTypesWithValueError.args = {
  askHonoree: true,
  askInMemoryOf: true,
  error: 'Error message',
  tributeType: 'inMemoryOf',
  tributeName: 'Jane Doe'
};
