import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import SwagEditor, { SwagEditorProps } from './SwagEditor';

const elementContent = {
  swags: [
    {
      swagName: 'mock-swag-name',
      swagOptions: ['mock-swag-1', 'mock-swag-2']
    }
  ],
  swagThreshold: 1
};

function tree(props?: Partial<SwagEditorProps>) {
  return render(
    <SwagEditor
      elementContent={elementContent}
      elementRequiredFields={[]}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      pagePreview={{} as any}
      setUpdateDisabled={jest.fn()}
      {...props}
    />
  );
}

describe('SwagEditor', () => {
  it('displays instructions', () => {
    tree();
    expect(
      screen.getByText(
        "If you offer 'swag' or promotional items to your contributors for giving over a certain amount, you can customize the offering here."
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'Enter the minimum contribution per year to qualify and then customize the dropdown with the options available for selection (e.g. If you offer T-shirts, you can fill the dropdown with the T-shirt sizes available.)'
      )
    ).toBeVisible();
  });

  it('disables updates if there are no swag groups in element content', () => {
    const setUpdateDisabled = jest.fn();

    tree({ setUpdateDisabled, elementContent: { ...elementContent, swags: [] } });
    expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
  });

  it('disables updates if the threshold is not a positive number', () => {
    const setUpdateDisabled = jest.fn();

    tree({ setUpdateDisabled, elementContent: { ...elementContent, swagThreshold: -1 } });
    expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
  });

  it('disables updates if there is no swag group name defined', () => {
    const setUpdateDisabled = jest.fn();

    tree({ setUpdateDisabled, elementContent: { ...elementContent, swags: [{ swagOptions: ['one'] }] as any } });
    expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
  });

  it('blocks updates if there are no swag options set', () => {
    const setUpdateDisabled = jest.fn();

    tree({ setUpdateDisabled, elementContent: { ...elementContent, swags: [{ swagOptions: [] }] as any } });
    expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
  });

  it('disables updates if the swag name is an empty string', () => {
    const setUpdateDisabled = jest.fn();

    tree({
      setUpdateDisabled,
      elementContent: { ...elementContent, swags: [{ swagName: '', swagOptions: ['test-option'] }] }
    });
    expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
  });

  it('enables updates if there are swag options, a threshold, and a swag name defined', () => {
    const setUpdateDisabled = jest.fn();

    tree({
      setUpdateDisabled,
      elementContent: {
        ...elementContent,
        swags: [{ swagName: 'test-name', swagOptions: ['test-option'] }],
        swagThreshold: 1
      }
    });
    expect(setUpdateDisabled.mock.calls).toEqual([[false]]);
  });

  describe('The swag threshold amount field', () => {
    it('displays the amount set in element content', () => {
      tree({ elementContent: { ...elementContent, swagThreshold: 123.45 } });
      expect(screen.getByLabelText('Amount to Qualify')).toHaveValue(123.45);
    });

    it('updates the element content when a positive number is entered', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.change(screen.getByLabelText('Amount to Qualify'), { target: { value: '567.89' } });
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, swagThreshold: 567.89 }]]);
    });

    it('sets swags in element content to an empty array if it was unset', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: {} as any });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.change(screen.getByLabelText('Amount to Qualify'), { target: { value: '567.89' } });
      expect(onChangeElementContent.mock.calls).toEqual([[{ swags: [], swagThreshold: 567.89 }]]);
    });

    it("doesn't update element content and shows an error message when a negative number is entered", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: {} as any });
      fireEvent.change(screen.getByLabelText('Amount to Qualify'), { target: { value: '-1' } });
      expect(onChangeElementContent).not.toBeCalled();
      expect(screen.getByText('Please enter a positive number with at most two decimal places.')).toBeVisible();
    });

    it("doesn't update element content when a number with too many decimal places is entered", () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: {} as any });
      fireEvent.change(screen.getByLabelText('Amount to Qualify'), { target: { value: '1.234' } });
      expect(onChangeElementContent).not.toBeCalled();
      expect(screen.getByText('Please enter a positive number with at most two decimal places.')).toBeVisible();
    });
  });

  describe('The swag name field', () => {
    it('displays the name of the first swag group', () => {
      tree({
        elementContent: {
          ...elementContent,
          swags: [
            { swagName: 'test-name', swagOptions: [] },
            { swagName: 'incorrect', swagOptions: [] }
          ]
        }
      });
      expect(screen.getByLabelText('Item Option')).toHaveValue('test-name');
    });

    it('updates element content when edited', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.change(screen.getByLabelText('Item Option'), { target: { value: 'new-name' } });
      expect(onChangeElementContent.mock.calls).toEqual([
        [{ ...elementContent, swags: [{ ...elementContent.swags[0], swagName: 'new-name' }] }]
      ]);
    });

    it('does not update element content if the field is edited to an empty string', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.change(screen.getByLabelText('Item Option'), { target: { value: '' } });
      expect(onChangeElementContent).not.toBeCalled();
    });

    it('shows an error message if the field is an empty string', () => {
      tree({ elementContent: { ...elementContent, swags: [{ swagName: '', swagOptions: [] }] } });
      expect(screen.getByText('You must enter a name.')).toBeVisible();
    });
  });

  describe('The swag option list', () => {
    it('shows each swag option in element content', () => {
      tree({ elementContent: { swags: [{ swagName: 'test-name', swagOptions: ['test-1', 'test-2'] }] } });
      expect(screen.getByText('test-1')).toBeVisible();
      expect(screen.getByText('test-2')).toBeVisible();
    });

    it('updates element content when a new item is added', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      userEvent.type(screen.getByLabelText('Add new option'), 'new-swag-item');
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [
          {
            ...elementContent,
            swags: [
              {
                swagName: elementContent.swags[0].swagName,
                swagOptions: [...elementContent.swags[0].swagOptions, 'new-swag-item']
              }
            ]
          }
        ]
      ]);
    });

    it('updates element content when a new item is removed', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove mock-swag-1' }));
      expect(onChangeElementContent.mock.calls).toEqual([
        [
          {
            ...elementContent,
            swags: [
              {
                swagName: elementContent.swags[0].swagName,
                swagOptions: elementContent.swags[0].swagOptions.slice(1)
              }
            ]
          }
        ]
      ]);
    });

    it("doesn't allow swag options longer than 40 characters", () => {
      tree();
      userEvent.type(screen.getByLabelText('Add new option'), 'x'.repeat(41));
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
      expect(screen.getByText('An option can be 40 characters long at most.')).toBeInTheDocument();
    });

    it("doesn't allow duplicate options", () => {
      tree();
      userEvent.type(screen.getByLabelText('Add new option'), 'mock-swag-1');
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
      expect(screen.getByText('This option has already been added.')).toBeInTheDocument();
    });
  });

  describe('The opt-out checkbox', () => {
    it('is checked if element content has it set', () => {
      tree({ elementContent: { ...elementContent, optOutDefault: true } });
      expect(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" })).toBeChecked();
    });

    it("is unchecked if element content doesn't have it set", () => {
      tree({ elementContent: { ...elementContent, optOutDefault: false } });
      expect(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" })).not.toBeChecked();
    });

    it('sets it to true in element content when checked', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { ...elementContent, optOutDefault: false } });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, optOutDefault: true }]]);
    });

    it('sets it to false in element content when unchecked', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { ...elementContent, optOutDefault: true } });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, optOutDefault: false }]]);
    });

    it('sets swags in element content to an empty array if it was unset', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { optOutDefault: true } });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ optOutDefault: false, swags: [] }]]);
    });
  });

  describe('The complimentary NYT subscription checkbox', () => {
    it('is present if the page plan has it enabled', () => {
      tree({
        elementContent,
        pagePreview: { allow_offer_nyt_comp: true } as any
      });
      expect(
        screen.getByRole('checkbox', { name: 'Offer contributors a complimentary NYT subscription' })
      ).toBeInTheDocument();
    });

    it("isn't present if the page plan has it disabled", () => {
      tree({
        elementContent,
        pagePreview: { allow_offer_nyt_comp: false } as any
      });
      expect(
        screen.queryByRole('checkbox', { name: 'Offer contributors a complimentary NYT subscription' })
      ).not.toBeInTheDocument();
    });

    it('is checked if element content has it set', () => {
      tree({
        elementContent: { ...elementContent, offerNytComp: true },
        pagePreview: { allow_offer_nyt_comp: true } as any
      });
      expect(
        screen.getByRole('checkbox', { name: 'Offer contributors a complimentary NYT subscription' })
      ).toBeChecked();
    });

    it("is unchecked if element content doesn't have it set", () => {
      tree({
        elementContent: { ...elementContent, offerNytComp: false },
        pagePreview: { allow_offer_nyt_comp: true } as any
      });
      expect(
        screen.getByRole('checkbox', { name: 'Offer contributors a complimentary NYT subscription' })
      ).not.toBeChecked();
    });

    it('sets it to true in element content when checked', () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { ...elementContent, offerNytComp: false },
        pagePreview: { allow_offer_nyt_comp: true } as any
      });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Offer contributors a complimentary NYT subscription' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, offerNytComp: true }]]);
    });

    it('sets it to false in element content when unchecked', () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { ...elementContent, offerNytComp: true },
        pagePreview: { allow_offer_nyt_comp: true } as any
      });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Offer contributors a complimentary NYT subscription' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...elementContent, offerNytComp: false }]]);
    });

    it('sets swags in element content to an empty array if it was unset', () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { offerNytComp: false },
        pagePreview: { allow_offer_nyt_comp: true } as any
      });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Offer contributors a complimentary NYT subscription' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ offerNytComp: true, swags: [] }]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
