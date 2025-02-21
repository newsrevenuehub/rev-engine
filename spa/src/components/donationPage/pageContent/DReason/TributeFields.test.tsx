import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import TributeFields, { TributeFieldsProps, TributeType } from './TributeFields';

function tree(props?: Partial<TributeFieldsProps>) {
  return render(
    <TributeFields
      onChangeTributeName={jest.fn}
      onChangeTributeType={jest.fn}
      tributeName=""
      tributeType={null}
      {...props}
    />
  );
}

describe('TributeFields', () => {
  it('shows nothing if neither askHonoree nor askInMemoryOf are set', () => {
    tree();
    expect(document.body.textContent).toBe('');
  });

  describe.each([
    ['askHonoree', 'inHonorOf', 'honoree', 'honoree'],
    ['askInMemoryOf', 'inMemoryOf', 'inMemoryOf', 'in_memory_of']
  ])("When there's only an %s option", (propName, label, value, inputName) => {
    describe('When a tribute type is unset', () => {
      it('shows an unchecked checkbox', () => {
        tree({ [propName]: true });
        expect(
          screen.getByRole('checkbox', { name: `donationPage.dReason.tributeSelector.yes.${label}` })
        ).not.toBeChecked();
      });

      it("doesn't show a text field for entry", () => {
        tree({ [propName]: true });
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });

      it('calls onChangeTributeType when the checkbox is checked', () => {
        const onChangeTributeType = jest.fn();

        tree({ onChangeTributeType, [propName]: true });
        expect(onChangeTributeType).not.toBeCalled();
        fireEvent.click(screen.getByRole('checkbox', { name: `donationPage.dReason.tributeSelector.yes.${label}` }));
        expect(onChangeTributeType.mock.calls).toEqual([[value]]);
      });

      it('is accessible', async () => {
        const { container } = tree();

        expect(await axe(container)).toHaveNoViolations();
      });
    });

    describe('When a tribute type is set', () => {
      it('shows a checked checkbox', () => {
        tree({ [propName]: true, tributeType: value as TributeType });
        expect(
          screen.getByRole('checkbox', { name: `donationPage.dReason.tributeSelector.yes.${label}` })
        ).toBeChecked();
      });

      it('shows a text field with the correct name', () => {
        tree({ [propName]: true, tributeType: value as TributeType });
        expect(screen.getByRole('textbox', { name: `donationPage.dReason.tributeSelector.${label}` })).toHaveAttribute(
          'name',
          inputName
        );
      });

      it('calls onChangeTributeType when the checkbox is unchecked', () => {
        const onChangeTributeType = jest.fn();

        tree({ onChangeTributeType, [propName]: true, tributeType: value as TributeType });
        expect(onChangeTributeType).not.toBeCalled();
        fireEvent.click(screen.getByRole('checkbox', { name: `donationPage.dReason.tributeSelector.yes.${label}` }));
        expect(onChangeTributeType.mock.calls).toEqual([[null]]);
      });

      it('calls onChangeTributeName when the user enters a value in the text field', () => {
        const onChangeTributeName = jest.fn();

        tree({ onChangeTributeName, [propName]: true, tributeType: value as TributeType });
        expect(onChangeTributeName).not.toBeCalled();
        fireEvent.change(screen.getByRole('textbox', { name: `donationPage.dReason.tributeSelector.${label}` }), {
          target: { value: 'change' }
        });
        expect(onChangeTributeName.mock.calls).toEqual([['change']]);
      });

      it('shows an error message if present', () => {
        tree({ [propName]: true, error: 'test-error', tributeType: value as TributeType });
        expect(screen.getByText('test-error')).toBeInTheDocument();
      });

      it('is accessible', async () => {
        const { container } = tree();

        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });

  describe('When both tribute types are allowed', () => {
    const radios = {
      'common.no': null,
      'donationPage.dReason.tributeSelector.yes.inHonorOf': 'honoree',
      'donationPage.dReason.tributeSelector.yes.inMemoryOf': 'inMemoryOf'
    };

    it('shows radio buttons for all options', () => {
      tree({ askHonoree: true, askInMemoryOf: true });
      expect(screen.getAllByRole('radio')).toHaveLength(3);

      for (const name of Object.keys(radios)) {
        expect(screen.getByRole('radio', { name })).toBeInTheDocument();
      }
    });

    it.each(Object.keys(radios))('calls onChangeTributeType when the radio button labeled %s is clicked', (name) => {
      const onChangeTributeType = jest.fn();

      // Force all radios to be deselected using a bad tributeType, so that a change event is always fired.
      tree({ onChangeTributeType, askHonoree: true, askInMemoryOf: true, tributeType: 'invalid' as any });
      expect(onChangeTributeType).not.toBeCalled();
      fireEvent.click(screen.getByRole('radio', { name }));
      expect(onChangeTributeType.mock.calls).toEqual([[radios[name as keyof typeof radios]]]);
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });

    it('shows no text field if no tribute type is selected', () => {
      tree({ tributeType: null, askHonoree: true, askInMemoryOf: true });
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    describe.each([
      ['honoree', 'inHonorOf'],
      ['inMemoryOf', 'inMemoryOf']
    ])('When the tribute type is %s', (tributeType, name) => {
      it('shows a text field with the correct name', () => {
        tree({ tributeType: tributeType as TributeType, askHonoree: true, askInMemoryOf: true });
        expect(
          screen.getByRole('textbox', { name: `donationPage.dReason.tributeSelector.${name}` })
        ).toBeInTheDocument();
      });

      it('calls onChangeTributeName when the user enters a value in the text field', () => {
        const onChangeTributeName = jest.fn();

        tree({ onChangeTributeName, tributeType: tributeType as TributeType, askHonoree: true, askInMemoryOf: true });
        expect(onChangeTributeName).not.toBeCalled();
        fireEvent.change(screen.getByRole('textbox', { name: `donationPage.dReason.tributeSelector.${name}` }), {
          target: { value: 'change' }
        });
        expect(onChangeTributeName.mock.calls).toEqual([['change']]);
      });

      it('is accessible', async () => {
        const { container } = tree();

        expect(await axe(container)).toHaveNoViolations();
      });
    });
  });
});
