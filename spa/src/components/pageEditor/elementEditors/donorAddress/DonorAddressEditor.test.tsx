import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DonorAddressEditor, { DonorAddressEditorProps } from './DonorAddressEditor';

function tree(props?: Partial<DonorAddressEditorProps>) {
  return render(
    <DonorAddressEditor
      elementContent={{}}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      {...props}
    />
  );
}

describe('DonorAddressEditor', () => {
  it('displays explanatory text', () => {
    tree();
    expect(
      screen.getByText(
        'Address data is critical to engage supporters and strengthen reader revenue programs. If you have, or plan to have, a major donor program you will need address for wealth-screening.'
      )
    ).toBeVisible();
    expect(
      screen.getByText('If you’re including a physical Swag option, full address should be required.')
    ).toBeVisible();
    expect(screen.getByText('Include additional labels above the address field for State.')).toBeVisible();
    expect(screen.getByText('(Zip/postal code and country are always required.)')).toBeVisible();
  });

  it('has a state checkbox which is disabled', () => {
    tree();
    expect(screen.getByRole('checkbox', { name: 'State (required)' })).toBeDisabled();
  });

  it('hides the state checkbox if zipAndCountryOnly is true', () => {
    tree({ elementContent: { zipAndCountryOnly: true } } as any);
    expect(screen.queryByRole('checkbox', { name: 'State (required)' })).not.toBeInTheDocument();
  });

  describe('the zip and country only checkbox', () => {
    it('is unchecked by default', () => {
      tree();
      expect(
        screen.getByRole('checkbox', {
          name: 'Include zip/postal code and country only (exclude all other address fields)'
        })
      ).not.toBeChecked();
    });

    it('is checked if zipAndCountryOnly is true', () => {
      tree({ elementContent: { zipAndCountryOnly: true } } as any);
      expect(
        screen.getByRole('checkbox', {
          name: 'Include zip/postal code and country only (exclude all other address fields)'
        })
      ).toBeChecked();
    });

    it('set all requiredFields to the element when zipAndCountryOnly = false', () => {
      const onChangeElementRequiredFields = jest.fn();

      expect(onChangeElementRequiredFields).not.toBeCalled();
      tree({ onChangeElementRequiredFields } as any);
      expect(onChangeElementRequiredFields).toBeCalledTimes(1);
      expect(onChangeElementRequiredFields.mock.calls).toEqual([
        [['mailing_postal_code', 'mailing_country', 'mailing_street', 'mailing_city', 'mailing_state']]
      ]);
    });

    it('set only zip & country requiredFields to the element when zipAndCountryOnly = true', () => {
      const onChangeElementRequiredFields = jest.fn();

      expect(onChangeElementRequiredFields).not.toBeCalled();
      tree({ elementContent: { zipAndCountryOnly: true }, onChangeElementRequiredFields } as any);
      expect(onChangeElementRequiredFields).toBeCalledTimes(1);
      expect(onChangeElementRequiredFields.mock.calls).toEqual([[['mailing_postal_code', 'mailing_country']]]);
    });

    it('adds zipAndCountryOnly & updates addressOptional to the element content when the user checks it', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent } as any);
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Include zip/postal code and country only (exclude all other address fields)'
        })
      );
      expect(onChangeElementContent.mock.calls).toEqual([[{ zipAndCountryOnly: true, addressOptional: false }]]);
    });

    it('toggles zipAndCountryOnly from the element content when the user unchecks it', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { zipAndCountryOnly: true } } as any);
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Include zip/postal code and country only (exclude all other address fields)'
        })
      );
      expect(onChangeElementContent.mock.calls).toEqual([[{ zipAndCountryOnly: false }]]);
    });
  });

  describe('the address optionality radio group', () => {
    it('required/optional radio buttons are disabled if zipAndCountryOnly is true', () => {
      tree({ elementContent: { zipAndCountryOnly: true } } as any);
      expect(screen.getByRole('radio', { name: 'Required' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Optional' })).toBeDisabled();
    });

    it('is checked as required as default', () => {
      tree();
      expect(screen.getByRole('radio', { name: 'Required' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Optional' })).not.toBeChecked();
    });

    it('is "required" if addressOptional is false', () => {
      tree({ elementContent: { addressOptional: false } } as any);
      expect(screen.getByRole('radio', { name: 'Required' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Optional' })).not.toBeChecked();
    });

    it('is "optional" if addressOptional is true', () => {
      tree({ elementContent: { addressOptional: true } } as any);
      expect(screen.getByRole('radio', { name: 'Required' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Optional' })).toBeChecked();
    });

    it('adds addressOptional = true to the element content when the user clicks Optional radio', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent } as any);
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('radio', { name: 'Optional' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ addressOptional: true }]]);
    });

    it('sets addressOptional = false from the element content when the user clicks Required radio', () => {
      const onChangeElementContent = jest.fn();

      tree({ onChangeElementContent, elementContent: { addressOptional: true } } as any);
      expect(onChangeElementContent).not.toBeCalled();
      userEvent.click(screen.getByRole('radio', { name: 'Required' }));
      expect(onChangeElementContent.mock.calls).toEqual([[{ addressOptional: false }]]);
    });

    it('sets "requiredFields" only to zip and country if addressOptional is true', () => {
      const onChangeElementRequiredFields = jest.fn();

      expect(onChangeElementRequiredFields).not.toBeCalled();
      tree({ onChangeElementRequiredFields, elementContent: { addressOptional: true } } as any);
      expect(onChangeElementRequiredFields).toBeCalledTimes(1);
      expect(onChangeElementRequiredFields.mock.calls).toEqual([[['mailing_postal_code', 'mailing_country']]]);
    });

    it('add all address fields in "requiredFields" if addressOptional is false', () => {
      const onChangeElementRequiredFields = jest.fn();

      expect(onChangeElementRequiredFields).not.toBeCalled();
      tree({ elementContent: { addressOptional: false }, onChangeElementRequiredFields } as any);
      expect(onChangeElementRequiredFields).toBeCalledTimes(1);
      expect(onChangeElementRequiredFields.mock.calls).toEqual([
        [['mailing_postal_code', 'mailing_country', 'mailing_street', 'mailing_city', 'mailing_state']]
      ]);
    });
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
