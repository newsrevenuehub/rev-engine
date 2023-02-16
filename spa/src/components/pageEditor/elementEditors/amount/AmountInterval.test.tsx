import userEvent from '@testing-library/user-event';
import { ContributionInterval } from 'constants/contributionIntervals';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import AmountInterval, { AmountIntervalProps, intervalHeaders } from './AmountInterval';

const options = [100, 200, 300];

function tree(props?: Partial<AmountIntervalProps>) {
  return render(
    <AmountInterval
      defaultOption={options[1]}
      interval="one_time"
      onAddAmount={jest.fn()}
      options={options}
      onRemoveAmount={jest.fn()}
      onSetDefaultAmount={jest.fn()}
      {...props}
    />
  );
}

describe('AmountInterval', () => {
  it.each(Object.entries(intervalHeaders))('displays the correct header for a %s interval', (interval, header) => {
    tree({ interval: interval as ContributionInterval });
    expect(screen.getByRole('heading')).toHaveTextContent(header);
  });

  it('displays AmountItems for each amount in element content', () => {
    expect.assertions(options.length);

    tree();

    for (const option of options) {
      expect(screen.getByText(option)).toBeVisible();
    }
  });

  it('makes the AmountItem non-removable if there is only one', () => {
    tree({ options: [100] });
    expect(screen.getByRole('button', { name: 'Remove 100' })).toBeDisabled();
  });

  it('calls the onRemoveAmount prop when an amount is removed', () => {
    const onRemoveAmount = jest.fn();

    tree({ onRemoveAmount });
    expect(onRemoveAmount).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: `Remove ${options[1]}` }));
    expect(onRemoveAmount.mock.calls).toEqual([[options[1]]]);
  });

  it('calls the onSetDefaultAmount prop when an amount is selected as default', () => {
    const onSetDefaultAmount = jest.fn();

    tree({ onSetDefaultAmount });
    expect(onSetDefaultAmount).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: `Make ${options[1]} default` }));
    expect(onSetDefaultAmount.mock.calls).toEqual([[options[1]]]);
  });

  it("calls onSetDefaultAmount with the first option if the default option doesn't exist", () => {
    const onSetDefaultAmount = jest.fn();

    tree({ onSetDefaultAmount, defaultOption: 0, options: [1, 2, 3] });
    expect(onSetDefaultAmount.mock.calls).toEqual([[1]]);
  });

  describe('The add amount field', () => {
    it.each([
      ['a number with more than two decimal places', '1.234'],
      ['a negative number', '-1'],
      ['zero', '0']
    ])("doesn't allow adding %s", (_, value) => {
      const onAddAmount = jest.fn();

      tree({ onAddAmount });
      userEvent.type(screen.getByLabelText('Add amount'), value);
      userEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onAddAmount).not.toBeCalled();
      expect(screen.getByText('Please enter a positive number with at most two decimal places.')).toBeInTheDocument();
      fireEvent.submit(screen.getByTestId('other-amount-form'));
      expect(onAddAmount).not.toBeCalled();
    });

    // These values don't show a validation message.

    it.each([
      ['a non-number', 'not a number'],
      ['an empty string', '']
    ])("doesn't allow adding %s", (_, value) => {
      const onAddAmount = jest.fn();

      tree({ onAddAmount });
      userEvent.type(screen.getByLabelText('Add amount'), value);
      userEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onAddAmount).not.toBeCalled();
      fireEvent.submit(screen.getByTestId('other-amount-form'));
      expect(onAddAmount).not.toBeCalled();
    });

    it("doesn't allow adding a duplicate amount", () => {
      const onAddAmount = jest.fn();

      tree({ onAddAmount });
      userEvent.type(screen.getByLabelText('Add amount'), options[2].toString());
      userEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onAddAmount).not.toBeCalled();
      expect(screen.getByText('This amount has already been added.')).toBeInTheDocument();
      fireEvent.submit(screen.getByTestId('other-amount-form'));
      expect(onAddAmount).not.toBeCalled();
    });

    it('adds an amount when the Add button is clicked', () => {
      const onAddAmount = jest.fn();

      tree({ onAddAmount });
      userEvent.type(screen.getByLabelText('Add amount'), '999.12');
      userEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onAddAmount.mock.calls).toEqual([[999.12]]);
    });

    it('adds an amount when the form is submitted', () => {
      const onAddAmount = jest.fn();

      tree({ onAddAmount });
      userEvent.type(screen.getByLabelText('Add amount'), '999.12');
      // eslint-disable-next-line testing-library/no-node-access
      fireEvent.submit(document.querySelector('form')!);
      expect(onAddAmount.mock.calls).toEqual([[999.12]]);
    });

    it('clears the field after adding an amount', () => {
      tree();
      userEvent.type(screen.getByLabelText('Add amount'), '999.12');
      userEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(screen.getByLabelText('Add amount')).toHaveValue(null);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
