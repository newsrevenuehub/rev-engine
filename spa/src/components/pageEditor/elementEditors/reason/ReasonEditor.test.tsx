import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { cleanup, render, screen } from 'test-utils';
import ReasonEditor, { ReasonEditorProps } from './ReasonEditor';

const elementContent = { reasons: [] };

function tree(props?: Partial<ReasonEditorProps>) {
  return render(
    <ReasonEditor
      pagePreview={{} as any}
      elementContent={{ reasons: [] }}
      elementRequiredFields={[]}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      setUpdateDisabled={jest.fn()}
      {...props}
    />
  );
}

describe('ReasonEditor', () => {
  describe('The checkbox for asking for a contribution reason', () => {
    it('is checked if the element content has askReason set to true', () => {
      tree({ elementContent: { ...elementContent, askReason: true } });
      expect(
        screen.getByRole('checkbox', { name: 'Ask contributor why they are making a contribution' })
      ).toBeChecked();
    });

    it('is unchecked if the element content has askReason set to false', () => {
      tree({ elementContent: { ...elementContent, askReason: false } });
      expect(
        screen.getByRole('checkbox', { name: 'Ask contributor why they are making a contribution' })
      ).not.toBeChecked();
    });

    it("sets askReason in element content to true when it's checked by the user", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Ask contributor why they are making a contribution' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, askReason: true }]]);
    });

    it("sets askReason in element content to fale when it's unchecked by the user", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { ...elementContent, askReason: true } });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Ask contributor why they are making a contribution' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, askReason: false }]]);
    });
  });

  describe('The checkbox for making a contribution reason required', () => {
    it('is visible if element content has askReason set to true', () => {
      tree({ elementContent: { ...elementContent, askReason: true } });
      expect(screen.getByText('Should filling this out be required?')).toBeVisible();
    });

    it('is not visible if element content has askReason set to false', () => {
      tree({ elementContent: { ...elementContent, askReason: false } });
      expect(screen.queryByText('Should filling this out be required?')).not.toBeInTheDocument();
    });

    it("is checked if 'reason_for_giving' is in element required fields", () => {
      tree({ elementContent: { ...elementContent, askReason: true }, elementRequiredFields: ['reason_for_giving'] });
      expect(screen.getByRole('checkbox', { name: 'Should filling this out be required?' })).toBeChecked();
    });

    it("is unchecked if 'reason_for_giving' is not in element required fields", () => {
      tree({ elementContent: { ...elementContent, askReason: true }, elementRequiredFields: ['unrelated'] });
      expect(screen.getByRole('checkbox', { name: 'Should filling this out be required?' })).not.toBeChecked();
    });

    it("adds 'reason_for_giving' to element required fields if checked", () => {
      const onChangeElementRequiredFields = jest.fn();

      tree({
        onChangeElementRequiredFields,
        elementContent: { ...elementContent, askReason: true },
        elementRequiredFields: ['unrelated']
      });
      expect(onChangeElementRequiredFields).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Should filling this out be required?' }));
      expect(onChangeElementRequiredFields.mock.calls).toEqual([[['unrelated', 'reason_for_giving']]]);
    });

    it("removes 'reason_for_giving' to element required fields if checked", () => {
      const onChangeElementRequiredFields = jest.fn();

      tree({
        onChangeElementRequiredFields,
        elementContent: { ...elementContent, askReason: true },
        elementRequiredFields: ['unrelated', 'reason_for_giving']
      });
      expect(onChangeElementRequiredFields).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name: 'Should filling this out be required?' }));
      expect(onChangeElementRequiredFields.mock.calls).toEqual([[['unrelated']]]);
    });
  });

  describe('The list of reasons for giving', () => {
    it('is visible if element content has askReason set to true', () => {
      tree({ elementContent: { ...elementContent, askReason: true } });
      expect(screen.getByText('Add a reason for giving below (optional)')).toBeVisible();
    });

    it('is not visible if element content has askReason set to false', () => {
      tree({ elementContent: { ...elementContent, askReason: false } });
      expect(screen.queryByText('Add a reason for giving below (optional)')).not.toBeInTheDocument();
    });

    it('displays the reasons set in element content', () => {
      tree({ elementContent: { askReason: true, reasons: ['test-reason-1', 'test-reason-2'] } });
      expect(screen.getByText('test-reason-1')).toBeVisible();
      expect(screen.getByText('test-reason-2')).toBeVisible();
    });

    it("doesn't throw an error if reasons in element content are undefined", () =>
      expect(() => tree({ elementContent: { askReason: true, reasons: undefined } } as any)).not.toThrow());

    it('changes element content when a reason is added', () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { askReason: true, reasons: ['test-reason-1', 'test-reason-2'] }
      });
      userEvent.type(screen.getByLabelText('Add a Reason for Giving'), 'new-reason');
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [{ askReason: true, reasons: ['test-reason-1', 'test-reason-2', 'new-reason'] }]
      ]);
    });
  });

  describe('The checkbox for asking for a contribution honoree', () => {
    it('is checked if the element content has askHonoree set to true', () => {
      tree({ elementContent: { ...elementContent, askHonoree: true } });
      expect(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in honor of somebody' })
      ).toBeChecked();
    });

    it('is unchecked if the element content has askHonoree set to false', () => {
      tree({ elementContent: { ...elementContent, askHonoree: false } });
      expect(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in honor of somebody' })
      ).not.toBeChecked();
    });

    it("sets askHonoree in element content to true when it's checked by the user", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in honor of somebody' })
      );
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, askHonoree: true }]]);
    });

    it("sets askHonoree in element content to fale when it's unchecked by the user", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { ...elementContent, askHonoree: true } });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in honor of somebody' })
      );
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, askHonoree: false }]]);
    });
  });

  describe('The checkbox for asking for a contribution in-memory-of', () => {
    it('is checked if the element content has askInMemoryOf set to true', () => {
      tree({ elementContent: { ...elementContent, askInMemoryOf: true } });
      expect(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in memory of somebody' })
      ).toBeChecked();
    });

    it('is unchecked if the element content has askInMemoryOf set to false', () => {
      tree({ elementContent: { ...elementContent, askInMemoryOf: false } });
      expect(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in memory of somebody' })
      ).not.toBeChecked();
    });

    it("sets askInMemoryOf in element content to true when it's checked by the user", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in memory of somebody' })
      );
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, askInMemoryOf: true }]]);
    });

    it("sets askInMemoryOf in element content to fale when it's unchecked by the user", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { ...elementContent, askInMemoryOf: true } });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(
        screen.getByRole('checkbox', { name: 'Ask contributor if their contribution is in memory of somebody' })
      );
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, askInMemoryOf: false }]]);
    });
  });

  it('disables updates if no reasons are asked for', () => {
    const setUpdateDisabled = jest.fn();

    tree({
      setUpdateDisabled,
      elementContent: { ...elementContent, askReason: false, askHonoree: false, askInMemoryOf: false }
    });
    expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
  });

  it('enables updates if at least one reason is asked for', () => {
    const setUpdateDisabled = jest.fn();

    tree({
      setUpdateDisabled,
      elementContent: { ...elementContent, askReason: true, askHonoree: false, askInMemoryOf: false }
    });
    cleanup();
    tree({
      setUpdateDisabled,
      elementContent: { ...elementContent, askReason: false, askHonoree: true, askInMemoryOf: false }
    });
    cleanup();
    tree({
      setUpdateDisabled,
      elementContent: { ...elementContent, askReason: false, askHonoree: false, askInMemoryOf: true }
    });

    // One call per render.
    expect(setUpdateDisabled.mock.calls).toEqual([[false], [false], [false]]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
