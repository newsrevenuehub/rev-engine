import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import FrequencyEditor, { FrequencyEditorProps } from './FrequencyEditor';
import userEvent from '@testing-library/user-event';

const elementContent = [
  { value: CONTRIBUTION_INTERVALS.ONE_TIME },
  { value: CONTRIBUTION_INTERVALS.MONTHLY, isDefault: true },
  { value: CONTRIBUTION_INTERVALS.ANNUAL }
];

// Cast to any to avoid typechecking.

const unrelatedContent: any = { displayName: 'unrelated', isDefault: true, value: 'unrelated' };

function tree(props?: Partial<FrequencyEditorProps>) {
  return render(
    <FrequencyEditor
      elementContent={elementContent}
      elementRequiredFields={[]}
      contributionIntervals={[]}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      setUpdateDisabled={jest.fn()}
      {...props}
    />
  );
}

describe('FrequencyEditor', () => {
  describe.each([
    ['one_time', 'One-time payments enabled', { value: CONTRIBUTION_INTERVALS.ONE_TIME, displayName: 'One-time' }],
    ['month', 'Monthly payments enabled', { value: CONTRIBUTION_INTERVALS.MONTHLY, displayName: 'Monthly' }],
    ['year', 'Yearly payments enabled', { value: CONTRIBUTION_INTERVALS.ANNUAL, displayName: 'Yearly' }]
  ])('The %s toggle', (frequencyValue, name, frequencyContent) => {
    it(`is on if element content contains a '${frequencyValue}' value`, () => {
      tree({ elementContent: elementContent.filter(({ value }) => value === frequencyValue) });
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
    });

    it(`is off if element content doesn't contain a '${frequencyValue}' value`, () => {
      tree({ elementContent: elementContent.filter(({ value }) => value !== frequencyValue) });
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
    });

    it(`adds '${frequencyValue}' to element content when toggled on`, () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: [unrelatedContent] });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name }));
      expect(onChangeElementContent.mock.calls).toEqual([[[unrelatedContent, frequencyContent]]]);
    });

    it(`removes '${frequencyValue}' from element content when toggled off`, () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: [unrelatedContent, frequencyContent]
      });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name }));
      expect(onChangeElementContent.mock.calls).toEqual([[[unrelatedContent]]]);
    });
  });

  describe.each([
    ['one_time', 'One-time', { value: CONTRIBUTION_INTERVALS.ONE_TIME, displayName: 'One-time' }],
    ['month', 'Monthly', { value: CONTRIBUTION_INTERVALS.MONTHLY, displayName: 'Monthly' }],
    ['year', 'Yearly', { value: CONTRIBUTION_INTERVALS.ANNUAL, displayName: 'Yearly' }]
  ])('The %s default radio button', (frequencyValue, name, frequencyContent) => {
    it('is selected if it is the default in element content', () => {
      tree({ elementContent: [{ ...frequencyContent, isDefault: true }] });
      expect(screen.getByRole('radio', { name })).toBeChecked();
    });

    it("isn't selected if it isn't the default in element content", () => {
      tree({
        elementContent: [{ ...frequencyContent, isDefault: false }]
      });
      expect(screen.getByRole('radio', { name })).not.toBeChecked();
    });

    it("changes element content so it's the default when selected by the user", () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: [unrelatedContent, { ...frequencyContent, isDefault: false }]
      });
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('radio', { name }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [
          [
            { ...unrelatedContent, isDefault: false },
            { ...frequencyContent, isDefault: true }
          ]
        ]
      ]);
    });
  });

  it('disables updates if no frequencies are enabled', () => {
    const setUpdateDisabled = jest.fn();

    tree({ setUpdateDisabled, elementContent: [] });
    expect(screen.getByText('You must have at least 1 frequency enabled.')).toBeVisible();
    expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
  });

  it('enables update if at least one frequency is enabled', () => {
    const setUpdateDisabled = jest.fn();

    tree({ setUpdateDisabled, elementContent });
    expect(screen.queryByText('You must have at least 1 frequency enabled.')).not.toBeInTheDocument();
    expect(setUpdateDisabled.mock.calls).toEqual([[false]]);
  });

  it("selects the first enabled frequency as default if there's no default set", () => {
    const onChangeElementContent = jest.fn();

    tree({
      onChangeElementContent,
      elementContent: elementContent.map((content) => ({ ...content, isDefault: false }))
    });
    expect(onChangeElementContent.mock.calls).toEqual([
      [
        [
          { ...elementContent[0], isDefault: true },
          { ...elementContent[1], isDefault: false },
          { ...elementContent[2], isDefault: false }
        ]
      ]
    ]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
