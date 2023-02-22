import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributorInfoEditor, { ContributorInfoEditorProps } from './ContributorInfoEditor';

function tree(props?: Partial<ContributorInfoEditorProps>) {
  return render(
    <ContributorInfoEditor
      elementContent={{}}
      elementRequiredFields={[]}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      pagePreview={{} as any}
      setUpdateDisabled={jest.fn()}
      {...props}
    />
  );
}

describe('ContributorInfoEditor', () => {
  it('shows a checkbox to control whether to ask the user for a phone number', () => {
    tree();
    expect(screen.getByRole('checkbox', { name: 'Ask for phone number?' })).toBeInTheDocument();
  });

  it('shows a checkbox to control whether phone number is required', () => {
    tree();
    expect(screen.getByRole('checkbox', { name: 'Required to complete contribution' })).toBeInTheDocument();
  });

  it("removes 'phone' from the element required fields if askPhone is false in element content", () => {
    const onChangeElementRequiredFields = jest.fn();

    tree({ onChangeElementRequiredFields, elementContent: {}, elementRequiredFields: ['phone', 'unrelated'] });
    expect(onChangeElementRequiredFields.mock.calls).toEqual([[['unrelated']]]);
  });

  describe('When the element has askPhone set to true', () => {
    it('checks the relevant checkbox', () => {
      tree({ elementContent: { askPhone: true } });
      expect(screen.getByRole('checkbox', { name: 'Ask for phone number?' })).toBeChecked();
    });

    it("sets the element's askPhone property to false when the relevant checkbox is unchecked", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { askPhone: true } });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Ask for phone number?' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ askPhone: false }]]);
    });

    it('enables the checkbox for requiring phone number', () => {
      tree({ elementContent: { askPhone: true } });
      expect(screen.getByRole('checkbox', { name: 'Required to complete contribution' })).toBeEnabled();
    });
  });

  describe('When the element has askPhone set to false', () => {
    it('unchecks the relevant checkbox', () => {
      tree({ elementContent: { askPhone: false } });
      expect(screen.getByRole('checkbox', { name: 'Ask for phone number?' })).not.toBeChecked();
    });

    it("sets the element's askPhone property to true when the relevant checkbox is checked", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { askPhone: false } });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Ask for phone number?' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ askPhone: true }]]);
    });

    it('disables the checkbox for requiring phone number', () => {
      tree({ elementContent: { askPhone: false } });
      expect(screen.getByRole('checkbox', { name: 'Required to complete contribution' })).toBeDisabled();
    });
  });

  describe("When the element has 'phone' in its required fields", () => {
    it('checks the relevant checkbox', () => {
      tree({ elementContent: { askPhone: true }, elementRequiredFields: ['phone'] });
      expect(screen.getByRole('checkbox', { name: 'Required to complete contribution' })).toBeChecked();
    });

    it("removes 'phone' from required fields when the checkbox is unchecked", () => {
      const onChangeElementRequiredFields = jest.fn();

      tree({ onChangeElementRequiredFields, elementContent: { askPhone: true }, elementRequiredFields: ['phone'] });
      expect(onChangeElementRequiredFields).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Required to complete contribution' }));
      expect(onChangeElementRequiredFields.mock.calls).toEqual([[[]]]);
    });
  });

  describe("When the element doesn't have 'phone' in its required fields", () => {
    it('unchecks the relevant checkbox', () => {
      tree({ elementContent: { askPhone: true }, elementRequiredFields: ['unrelated'] });
      expect(screen.getByRole('checkbox', { name: 'Required to complete contribution' })).not.toBeChecked();
    });

    it("adds 'phone' to required fields when the checkbox is checked", () => {
      const onChangeElementRequiredFields = jest.fn();

      tree({ onChangeElementRequiredFields, elementContent: { askPhone: true }, elementRequiredFields: ['unrelated'] });
      expect(onChangeElementRequiredFields).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Required to complete contribution' }));
      expect(onChangeElementRequiredFields.mock.calls).toEqual([[['unrelated', 'phone']]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
