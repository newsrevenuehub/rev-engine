import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ReasonFields, { ReasonFieldsProps } from './ReasonFields';
import userEvent from '@testing-library/user-event';

function tree(props?: Partial<ReasonFieldsProps>) {
  return render(
    <ReasonFields
      onChangeOption={jest.fn()}
      onChangeText={jest.fn()}
      options={['reason 1', 'reason 2']}
      selectedOption=""
      text=""
      {...props}
    />
  );
}

const OTHER_LABEL = 'donationPage.dReason.other';

describe('ReasonFields', () => {
  describe('When there are preselected options', () => {
    it('shows a select named reason_for_giving with preselected options and an Other option', () => {
      tree();

      // The named input is hidden.
      // eslint-disable-next-line testing-library/no-node-access
      expect(document.querySelector('input[name="reason_for_giving"]')).toBeInTheDocument();
      userEvent.click(screen.getByRole('button'));
      expect(screen.getAllByRole('option')).toHaveLength(3);
      expect(screen.getByRole('option', { name: 'reason 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'reason 2' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: OTHER_LABEL })).toBeInTheDocument();
    });

    it("doesn't show a text box initially", () => {
      tree();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('selects the option indicated by selectedOption', () => {
      tree({ selectedOption: 'reason 2' });
      expect(screen.getByRole('button', { name: 'reason 2' })).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-node-access
      expect(document.querySelector('input[name="reason_for_giving"]')).toHaveValue('reason 2');
    });

    it('makes the select required if set', () => {
      tree({ required: true });
      expect(screen.getByTestId('reason-for-giving-reason-select').dataset.required).toBe('true');
    });

    it('leaves the select optional if unset', () => {
      tree({ required: false });
      expect(screen.getByTestId('reason-for-giving-reason-select').dataset.required).toBe('false');
    });

    it('calls onChangeOption when the user chooses an option', () => {
      const onChangeOption = jest.fn();

      tree({ onChangeOption });
      userEvent.click(screen.getByRole('button'));
      expect(onChangeOption).not.toBeCalled();
      userEvent.click(screen.getByRole('option', { name: 'reason 2' }));
      expect(onChangeOption.mock.calls).toEqual([['reason 2']]);
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });

    describe.each([
      ['the Other option is selected', { selectedOption: OTHER_LABEL }],
      ['there are no preselected options', { options: [] }]
    ])('When %s', (_, props: Partial<ReasonFieldsProps>) => {
      it('shows a text field named reason_for_giving with the value of the text prop', () => {
        tree({ ...props, text: 'test-value' });

        const input = screen.getByRole('textbox', { name: 'donationPage.dReason.tellUsWhy' });

        expect(input).toHaveAttribute('name', 'reason_for_giving');
        expect(input).toHaveValue('test-value');
      });

      it('sets no name on the select', () => {
        tree({ ...props, text: 'test-value' });
        expect(screen.getByRole('textbox', { name: 'donationPage.dReason.tellUsWhy' })).toHaveAttribute(
          'name',
          'reason_for_giving'
        );
        // e.g. if it was set on the select also, there would be two.
        // eslint-disable-next-line testing-library/no-node-access
        expect(document.querySelectorAll('[name="reason_for_giving"]')).toHaveLength(1);
      });

      it('makes the text field required if set', () => {
        tree({ ...props, required: true });
        expect(screen.getByRole('textbox', { name: 'donationPage.dReason.tellUsWhy' })).toBeRequired();
      });

      it('leaves the text field optional if unset', () => {
        tree({ ...props, required: false });
        expect(screen.getByRole('textbox', { name: 'donationPage.dReason.tellUsWhy' })).not.toBeRequired();
      });

      it('calls onChangeText when the user enters text', () => {
        const onChangeText = jest.fn();

        tree({ ...props, onChangeText });
        expect(onChangeText).not.toBeCalled();
        fireEvent.change(screen.getByRole('textbox', { name: 'donationPage.dReason.tellUsWhy' }), {
          target: { value: 'test value' }
        });
        expect(onChangeText.mock.calls).toEqual([['test value']]);
      });

      it('shows an error on the text field if set', () => {
        tree({ ...props, error: 'test-error' });
        expect(screen.getByText('test-error')).toBeInTheDocument();
      });

      it('is accessible', async () => {
        const { container } = tree(props);

        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });
});
