import { Meta, StoryObj } from '@storybook/react';
import DonationPageForm, { DonationPageFormProps } from './DonationPageForm';
import { DonationPageContext } from './DonationPage';
import { TextField } from 'components/base';

function DonationPageFormDemo(props: DonationPageFormProps) {
  return (
    <DonationPageContext.Provider value={{ amount: 123 } as any}>
      <DonationPageForm {...props}>
        <p>
          <TextField label="Required Field" required />
        </p>
        <p>
          <TextField label="Optional Field" />
        </p>
      </DonationPageForm>
    </DonationPageContext.Provider>
  );
}

const meta: Meta<typeof DonationPageFormDemo> = {
  component: DonationPageFormDemo,
  title: 'Donation Page/DonationPageForm',
  args: {
    disabled: false,
    loading: false
  },
  argTypes: {
    onSubmit: { action: 'onSubmit' }
  }
};

export default meta;

type Story = StoryObj<typeof DonationPageFormDemo>;

export const Default: Story = {};
export const Disabled: Story = {};

Disabled.args = { disabled: true };

export const Loading: Story = {};

Loading.args = { loading: true };
