import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import { CONTAINS_SEMICOLON_ERROR } from 'utilities/swagValue';
import SwagEditor, { SwagEditorProps } from './SwagEditor';

jest.mock('./SwagOptions');

const mockElementContent = {
  swagThreshold: 100,
  swags: [
    {
      swagName: 'mock-swag-name',
      swagOptions: ['mock-option-1', 'mock-option-2']
    }
  ]
};

function tree(props?: Partial<SwagEditorProps>) {
  return render(
    <SwagEditor
      contributionIntervals={[]}
      elementContent={mockElementContent}
      elementRequiredFields={[]}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      setUpdateDisabled={jest.fn()}
      {...props}
    />
  );
}

describe('SwagEditor', () => {
  describe('The threshold text field', () => {
    it("displays what's set in element content", () => {
      tree({ elementContent: { ...mockElementContent, swagThreshold: 123.45 } });
      expect(screen.getByRole('spinbutton', { name: 'Amount to Qualify' })).toHaveValue(123.45);
    });

    it('handles legacy string values correctly', () => {
      tree({ elementContent: { ...mockElementContent, swagThreshold: '123.45' } });
      expect(screen.getByRole('spinbutton', { name: 'Amount to Qualify' })).toHaveValue(123.45);
    });

    describe('When set to a valid value', () => {
      it('updates element content with a number', () => {
        const onChangeElementContent = jest.fn();

        tree({ onChangeElementContent });
        expect(onChangeElementContent).not.toBeCalled();
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount to Qualify' }), {
          target: { value: '123.45' }
        });
        expect(onChangeElementContent.mock.calls).toEqual([[{ ...mockElementContent, swagThreshold: 123.45 }]]);
      });

      it('enables updates', () => {
        const setUpdateDisabled = jest.fn();

        tree({ setUpdateDisabled });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount to Qualify' }), {
          target: { value: '123.45' }
        });
        expect(setUpdateDisabled.mock.calls).toEqual([[false]]);
      });
    });

    describe('When set to an invalid value', () => {
      it("doesn't update element content", () => {
        const onChangeElementContent = jest.fn();

        tree({ onChangeElementContent });
        expect(onChangeElementContent).not.toBeCalled();
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount to Qualify' }), { target: { value: 'bad' } });
        expect(onChangeElementContent).not.toBeCalled();
      });

      it('shows an error message', () => {
        tree();
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount to Qualify' }), { target: { value: 'bad' } });
        expect(screen.getByRole('spinbutton', { name: 'Amount to Qualify' })).toBeInvalid();
        expect(screen.getByText('Please enter a positive number.')).toBeVisible();
      });

      it('disables updates', () => {
        const setUpdateDisabled = jest.fn();

        tree({ setUpdateDisabled });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount to Qualify' }), { target: { value: 'bad' } });

        // First false is the initial render.
        expect(setUpdateDisabled.mock.calls).toEqual([[false], [true]]);
      });
    });
  });

  describe('Swag options', () => {
    it('displays the first swag name', () => {
      tree({ elementContent: { ...mockElementContent, swags: [{ swagName: 'test-name', swagOptions: [] }] } });
      expect(screen.getByTestId('mock-swag-options').dataset.swagName).toBe('test-name');
    });

    it("doesn't show a swag error initially", () => {
      tree();
      expect(screen.getByTestId('mock-swag-options').dataset.swagNameError).toBeUndefined();
    });

    it('displays the first swag options', () => {
      const swagOptions = ['option-1', 'option-2'];

      tree({ elementContent: { ...mockElementContent, swags: [{ swagOptions, swagName: 'test-name' }] } });
      expect(screen.getByTestId('mock-swag-options').dataset.swagOptions).toBe(JSON.stringify(swagOptions));
    });

    describe('When the swag name field changes to a valid value', () => {
      it('updates element content', () => {
        const onChangeElementContent = jest.fn();

        tree({ onChangeElementContent });
        expect(onChangeElementContent).not.toBeCalled();
        fireEvent.click(screen.getByText('onChangeSwagName valid'));
        expect(onChangeElementContent.mock.calls).toEqual([
          [
            {
              ...mockElementContent,
              swags: [
                {
                  ...mockElementContent.swags[0],
                  swagName: 'valid'
                }
              ]
            }
          ]
        ]);
      });

      it('enables updates', () => {
        const setUpdateDisabled = jest.fn();

        tree({ setUpdateDisabled });
        fireEvent.click(screen.getByText('onChangeSwagName valid'));
        expect(setUpdateDisabled.mock.calls).toEqual([[false]]);
      });
    });

    describe('When the swag name field changes to an invalid value', () => {
      it("doesn't update element content", () => {
        const onChangeElementContent = jest.fn();

        tree({ onChangeElementContent });
        expect(onChangeElementContent).not.toBeCalled();
        fireEvent.click(screen.getByText('onChangeSwagName invalid'));
        expect(onChangeElementContent).not.toBeCalled();
      });

      it('disables updates', () => {
        const setUpdateDisabled = jest.fn();

        tree({ setUpdateDisabled });
        fireEvent.click(screen.getByText('onChangeSwagName invalid'));

        // First false is initial render.
        expect(setUpdateDisabled.mock.calls).toEqual([[false], [true]]);
      });

      it('sets the swag name error', () => {
        tree();
        fireEvent.click(screen.getByText('onChangeSwagName invalid'));
        expect(screen.getByTestId('mock-swag-options').dataset.swagNameError).toBe(CONTAINS_SEMICOLON_ERROR);
      });
    });

    it('adds an option to the first swag when added by the user', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByText('onAddSwagOption'));
      expect(onChangeElementContent.mock.calls).toEqual([
        [
          {
            ...mockElementContent,
            swags: [
              {
                ...mockElementContent.swags[0],
                swagOptions: [...mockElementContent.swags[0].swagOptions, 'mock-swag-option']
              }
            ]
          }
        ]
      ]);
    });

    it('removes an option from the first swag when removed by the user', () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: {
          ...mockElementContent,
          swags: [
            {
              swagName: 'test',
              swagOptions: ['preserved', 'mock-swag-option', 'preserved2']
            }
          ]
        }
      });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByText('onRemoveSwagOption'));
      expect(onChangeElementContent.mock.calls).toEqual([
        [
          {
            ...mockElementContent,
            swags: [
              {
                swagName: 'test',
                swagOptions: ['preserved', 'preserved2']
              }
            ]
          }
        ]
      ]);
    });
  });

  describe('The opt-out checkbox', () => {
    it('is checked if set in element content', () => {
      tree({ elementContent: { ...mockElementContent, optOutDefault: true } });
      expect(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" })).toBeChecked();
    });

    it('is unchecked if not set in element content', () => {
      tree({ elementContent: { ...mockElementContent, optOutDefault: false } });
      expect(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" })).not.toBeChecked();
    });

    it('changes element content when checked', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { ...mockElementContent, optOutDefault: false } });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...mockElementContent, optOutDefault: true }]]);
    });

    it('changes element content when unchecked', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { ...mockElementContent, optOutDefault: true } });
      expect(onChangeElementContent).not.toBeCalled();
      fireEvent.click(screen.getByRole('checkbox', { name: "'Opt-out of swag' checked by default" }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ ...mockElementContent, optOutDefault: false }]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
