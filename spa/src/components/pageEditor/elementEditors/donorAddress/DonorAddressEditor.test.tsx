import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DonorAddressEditor, { DonorAddressEditorProps } from './DonorAddressEditor';

function tree(props?: Partial<DonorAddressEditorProps>) {
  return render(<DonorAddressEditor elementContent={{}} onChangeElementContent={jest.fn()} {...props} />);
}

describe('DonorAddressEditor', () => {
  it('displays explanatory text', () => {
    tree();
    expect(screen.getByText('Include additional labels above the address field for State.')).toBeVisible();
  });

  it('has a state checkbox which is disabled', () => {
    tree();
    expect(screen.getByRole('checkbox', { name: 'State (required)' })).toBeDisabled();
  });

  describe.each([
    ['province', 'Province'],
    ['region', 'Region']
  ])('The %s checkbox', (key, name) => {
    it(`is checked if '${key}' is in the element content`, () => {
      tree({ elementContent: { additionalStateFieldLabels: [key, 'unrelated'] } } as any);
      expect(screen.getByRole('checkbox', { name })).toBeChecked();
    });

    it(`is unchecked if '${key}' isn't in the element content`, () => {
      tree({ elementContent: { additionalStateFieldLabels: ['unrelated'] } } as any);
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
    });

    it(`adds '${key}' to the element content when the user checks it`, () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { additionalStateFieldLabels: ['unrelated'] } } as any);
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ additionalStateFieldLabels: ['unrelated', key] }]]);
    });

    it(`removes '${key}' from the element content when the user checks it`, () => {
      const onChangeElementContent = jest.fn();

      tree({
        onChangeElementContent,
        elementContent: { additionalStateFieldLabels: ['unrelated', key] }
      } as any);
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('checkbox', { name }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ additionalStateFieldLabels: ['unrelated'] }]]);
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
