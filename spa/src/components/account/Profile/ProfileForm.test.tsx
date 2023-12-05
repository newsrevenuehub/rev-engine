import userEvent from '@testing-library/user-event';
import { TAX_STATUS } from 'constants/fiscalStatus';
import { axe } from 'jest-axe';
import { render, screen, waitFor, fireEvent } from 'test-utils';
import ProfileForm, { ProfileFormProps } from './ProfileForm';

const onProfileSubmit = jest.fn();

const fieldErrors = {
  first_name: ['First name is required'],
  last_name: ['Last name is required'],
  organization_name: ['Organization name is required'],
  job_title: ['Job title is required'],
  fiscal_sponsor_name: ['Fiscal sponsor name is required'],
  detail: 'An error occurred'
};

function tree(props?: Partial<ProfileFormProps>) {
  return render(<ProfileForm onProfileSubmit={onProfileSubmit} {...props} />);
}

async function fillInAllFields() {
  const fieldEntries = [
    ['First Name', 'mock-first-name'],
    ['Last Name', 'mock-last-name'],
    ['Organization', 'mock-company-name'],
    ['Job Title Optional', 'mock-job-title']
  ];

  for (const [name, value] of fieldEntries) {
    userEvent.type(screen.getByLabelText(name), value);
  }

  await fireEvent.change(screen.getByLabelText('EIN Optional'), { target: { value: '987654321' } });

  userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
  userEvent.click(screen.getByRole('option', { name: 'Nonprofit' }));
}

describe('ProfileForm', () => {
  it('displays a first name field with empty default', () => {
    tree();

    const firstName = screen.getByLabelText('First Name');

    expect(firstName).toBeVisible();
    expect(firstName).toHaveValue('');
  });

  it('displays a last name field with empty default', () => {
    tree();

    const lastName = screen.getByLabelText('Last Name');

    expect(lastName).toBeVisible();
    expect(lastName).toHaveValue('');
  });

  it('displays a job title field with empty default', () => {
    tree();

    const jobTitle = screen.getByLabelText('Job Title Optional');

    expect(jobTitle).toBeVisible();
    expect(jobTitle).toHaveValue('');
  });

  it('displays an organization field with empty default', () => {
    tree();

    const companyName = screen.getByLabelText('Organization');

    expect(companyName).toBeVisible();
    expect(companyName).toHaveValue('');
  });

  it('displays a EIN (tax id) field with empty default', () => {
    tree();

    const taxId = screen.getByLabelText('EIN Optional');
    expect(taxId).toBeVisible();
    expect(taxId).toHaveValue('');
  });

  it('displays a company tax status selector with nonprofit, for-profit and fiscally sponsored values, but no preset value', () => {
    tree();

    const taxStatus = screen.getByRole('button', { name: /Company Tax Status Select your status/i });

    expect(taxStatus).toBeEnabled();
    userEvent.click(taxStatus);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Nonprofit' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'For-profit' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fiscally sponsored' })).toBeInTheDocument();
  });

  it('requires that the user enter a value for all fields except job title & tax id', async () => {
    const submitButton = () => screen.getByRole('button', { name: 'Finalize Account' });
    const fieldEntries = [
      ['First Name', 'mock-first-name'],
      ['Last Name', 'mock-last-name'],
      ['Organization', 'mock-company-name']
    ];

    tree();
    expect(submitButton()).toBeDisabled();

    for (const [name, value] of fieldEntries) {
      userEvent.type(screen.getByLabelText(name), value);
      expect(submitButton()).toBeDisabled();
    }

    userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
    userEvent.click(screen.getByRole('option', { name: 'Nonprofit' }));
    expect(submitButton()).toBeEnabled();
  });

  it('calls the onProfileSubmit prop with form data when submitted', async () => {
    const onProfileSubmit = jest.fn();

    tree({ onProfileSubmit });
    expect(onProfileSubmit).not.toHaveBeenCalled();
    await fillInAllFields();
    userEvent.click(screen.getByRole('button', { name: 'Finalize Account' }));
    await waitFor(() => expect(onProfileSubmit).toBeCalledTimes(1));
    expect(onProfileSubmit.mock.calls).toEqual([
      [
        {
          firstName: 'mock-first-name',
          lastName: 'mock-last-name',
          jobTitle: 'mock-job-title',
          companyName: 'mock-company-name',
          companyTaxStatus: 'nonprofit',
          taxId: '98-7654321',
          fiscalSponsorName: ''
        }
      ]
    ]);
  });

  it('disables the submit button when the disabled prop is true', async () => {
    tree({ disabled: true, onProfileSubmit });
    await fillInAllFields();
    expect(screen.getByRole('button', { name: 'Finalize Account' })).toBeDisabled();
  });

  describe('Fiscally Sponsored', () => {
    it('hides fiscal sponsor name by default', async () => {
      tree();
      expect(screen.queryByLabelText('Fiscal Sponsor Name')).not.toBeInTheDocument();
    });

    it('show fiscal sponsor name when tax status = fiscally sponsored', async () => {
      tree();
      userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally sponsored' }));
      expect(screen.getByLabelText('Fiscal Sponsor Name')).toBeInTheDocument();
    });

    it('requires that the user enter a value for all fields except job title & tax id', async () => {
      const submitButton = () => screen.getByRole('button', { name: 'Finalize Account' });
      const fieldEntries = [
        ['First Name', 'mock-first-name'],
        ['Last Name', 'mock-last-name'],
        ['Organization', 'mock-company-name']
      ];

      tree();
      expect(submitButton()).toBeDisabled();

      for (const [name, value] of fieldEntries) {
        userEvent.type(screen.getByLabelText(name), value);
        expect(submitButton()).toBeDisabled();
      }

      userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally sponsored' }));
      expect(submitButton()).toBeDisabled();

      userEvent.type(screen.getByLabelText('Fiscal Sponsor Name'), 'mock-fiscal-sponsor-name');
      expect(submitButton()).not.toBeDisabled();
    });

    it('calls the onProfileSubmit prop with form data when submitted', async () => {
      const onProfileSubmit = jest.fn();

      tree({ onProfileSubmit });
      expect(onProfileSubmit).not.toHaveBeenCalled();
      await fillInAllFields();

      userEvent.click(screen.getByRole('button', { name: /Company Tax Status nonprofit/i }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally sponsored' }));
      userEvent.type(screen.getByLabelText('Fiscal Sponsor Name'), 'mock-fiscal-sponsor-name');

      userEvent.click(screen.getByRole('button', { name: 'Finalize Account' }));
      await waitFor(() => expect(onProfileSubmit).toBeCalledTimes(1));
      expect(onProfileSubmit.mock.calls).toEqual([
        [
          {
            firstName: 'mock-first-name',
            lastName: 'mock-last-name',
            jobTitle: 'mock-job-title',
            companyName: 'mock-company-name',
            companyTaxStatus: TAX_STATUS.FISCALLY_SPONSORED,
            taxId: '98-7654321',
            fiscalSponsorName: 'mock-fiscal-sponsor-name'
          }
        ]
      ]);
    });
  });

  describe('Errors', () => {
    it('does not display errors by default', () => {
      tree();

      userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally sponsored' }));

      expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Last name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Organization name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Job title is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Fiscal sponsor name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('An error occurred')).not.toBeInTheDocument();
    });

    it('displays incoming errors', () => {
      tree({ error: fieldErrors });

      userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally sponsored' }));

      expect(screen.getByText('First name is required')).toBeVisible();
      expect(screen.getByText('Last name is required')).toBeVisible();
      expect(screen.getByText('Organization name is required')).toBeVisible();
      expect(screen.getByText('Job title is required')).toBeVisible();
      expect(screen.getByText('Fiscal sponsor name is required')).toBeVisible();
      expect(screen.getByText('An error occurred')).toBeVisible();
    });

    it.each([
      ['First Name', 50],
      ['Last Name', 50],
      ['Job Title', 50],
      ['Organization', 60],
      ['Fiscal Sponsor Name', 100]
    ])('displays a validation error for the %s field if too many characters are entered', async (fieldName, length) => {
      tree();
      userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally sponsored' }));

      // Fill out all required fields with something so that the submit button
      // becomes enabled, then put too much text into the field under test.

      userEvent.type(screen.getByLabelText('First Name'), 'x');
      userEvent.type(screen.getByLabelText('Last Name'), 'x');
      userEvent.type(screen.getByLabelText('Organization'), 'x');
      userEvent.type(screen.getByLabelText('Fiscal Sponsor Name', { exact: false }), 'x');
      userEvent.type(screen.getByLabelText(fieldName, { exact: false }), 'x'.repeat(length + 1));

      const submitButton = screen.getByRole('button', { name: 'Finalize Account' });

      expect(submitButton).toBeEnabled();
      userEvent.click(submitButton);

      await waitFor(() =>
        expect(
          screen.getByText(`${fieldName} must have a maximum of ${length} characters`, { exact: false })
        ).toBeVisible()
      );
      expect(screen.getByLabelText(fieldName, { exact: false })).toBeInvalid();
    });

    // This test fails in CI but works locally. We don't know why.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('displays max length error related to all fields with a character limit (FE validation)', async () => {
      tree();

      const limitTesting = [
        {
          field: 'First Name',
          limit: 50,
          error: 'First Name must have a maximum of 50 characters.'
        },
        {
          field: 'Last Name',
          limit: 50,
          error: 'Last Name must have a maximum of 50 characters.'
        },
        {
          field: 'Job Title Optional',
          limit: 50,
          error: 'Job Title must have a maximum of 50 characters.'
        },
        {
          field: 'Organization',
          limit: 60,
          error: 'Organization must have a maximum of 60 characters.'
        },
        {
          field: 'Fiscal Sponsor Name',
          limit: 100,
          error: 'Fiscal Sponsor Name must have a maximum of 100 characters.'
        }
      ];

      userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally sponsored' }));

      for (const { field, limit, error } of limitTesting) {
        userEvent.type(screen.getByLabelText(field), 'x'.repeat(limit + 1));
        expect(screen.queryByText(error)).not.toBeInTheDocument();
      }

      const submitButton = screen.getByRole('button', { name: 'Finalize Account' });
      expect(submitButton).toBeEnabled();
      userEvent.click(submitButton);

      await waitFor(() =>
        expect(screen.getByText('First Name must have a maximum of 50 characters', { exact: false })).toBeVisible()
      );

      for (const { error } of limitTesting) {
        expect(screen.getByText(error, { exact: false })).toBeVisible();
      }
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
