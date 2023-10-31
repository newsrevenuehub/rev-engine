import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import { CONTAINS_COLON_ERROR, CONTAINS_SEMICOLON_ERROR, TOO_LONG_ERROR } from 'utilities/swagValue';
import SwagOptions, { SwagOptionsProps } from './SwagOptions';

function tree(props?: Partial<SwagOptionsProps>) {
  return render(
    <SwagOptions
      onAddSwagOption={jest.fn()}
      onChangeSwagName={jest.fn()}
      onRemoveSwagOption={jest.fn()}
      swagName="mock-swag-name"
      swagOptions={['mock-option-1', 'mock-option-2']}
      {...props}
    />
  );
}

describe('SwagOptions', () => {
  describe('The swag name field', () => {
    it('displays the name set in the prop', () => {
      tree({ swagName: 'test-name' });
      expect(screen.getByRole('textbox', { name: 'Swag Selection Label' })).toHaveValue('test-name');
    });

    it("doesn't display an error if none is set", () => {
      tree({ swagNameError: undefined });
      expect(screen.getByRole('textbox', { name: 'Swag Selection Label' })).toBeValid();
    });

    it('displays an error if set in props', () => {
      tree({ swagNameError: 'mock-error' });
      expect(screen.getByRole('textbox', { name: 'Swag Selection Label' })).not.toBeValid();
      expect(screen.getByText('mock-error')).toBeVisible();
    });

    it("calls onChangeSwagName when the field is changed, even if the value isn't a valid swag name", () => {
      const onChangeSwagName = jest.fn();

      tree({ onChangeSwagName });
      expect(onChangeSwagName).not.toBeCalled();
      fireEvent.change(screen.getByRole('textbox', { name: 'Swag Selection Label' }), {
        target: { value: 'bad;value' }
      });
      expect(onChangeSwagName.mock.calls).toEqual([['bad;value']]);
    });
  });

  describe('The existing swag options', () => {
    it("doesn't throw an error if there are no options", () => expect(() => tree({ swagOptions: [] })).not.toThrow());

    it('displays an item for every option', () => {
      tree({ swagOptions: ['test-option-1', 'test-option-2', 'test-option-3'] });
      expect(screen.getByText('test-option-1')).toBeVisible();
      expect(screen.getByText('test-option-2')).toBeVisible();
      expect(screen.getByText('test-option-3')).toBeVisible();
    });

    it('calls onRemoveSwagOption when the remove button is clicked for an option', () => {
      const onRemoveSwagOption = jest.fn();

      tree({ onRemoveSwagOption, swagOptions: ['test-option-1'] });
      expect(onRemoveSwagOption).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove test-option-1' }));
      expect(onRemoveSwagOption.mock.calls).toEqual([['test-option-1']]);
    });
  });

  describe('The field to add a new swag option', () => {
    it('begins blank', () => {
      tree();
      expect(screen.getByRole('textbox', { name: 'Add Swag Option' })).toHaveValue('');
    });

    it('calls onAddSwagOption when a new option is added that is valid', () => {
      const onAddSwagOption = jest.fn();

      tree({ onAddSwagOption });
      fireEvent.change(screen.getByRole('textbox', { name: 'Add Swag Option' }), { target: { value: 'acceptable' } });
      expect(onAddSwagOption).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onAddSwagOption.mock.calls).toEqual([['acceptable']]);
    });

    it("doesn't do anything when trying to add a blank option", () => {
      const onAddSwagOption = jest.fn();

      tree({ onAddSwagOption });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onAddSwagOption).not.toBeCalled();
    });

    it("doesn't allow adding an option that already exists, even if case differs", () => {
      tree({ swagOptions: ['existing'] });
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
      fireEvent.change(screen.getByLabelText('Add Swag Option'), { target: { value: 'EXISTING' } });
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
      expect(screen.getByText('This option has already been added.')).toBeVisible();
    });

    it.each([
      ['is more than 100 characters long', 'x'.repeat(101), TOO_LONG_ERROR],
      ['contains a semicolon', 'bad;', CONTAINS_SEMICOLON_ERROR],
      ['contains a colon', ':bad', CONTAINS_COLON_ERROR]
    ])("doesn't allow adding an option that %s", (_, value, errorMessage) => {
      tree();
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
      fireEvent.change(screen.getByRole('textbox', { name: 'Add Swag Option' }), { target: { value } });
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
      expect(screen.getByText(errorMessage)).toBeVisible();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
