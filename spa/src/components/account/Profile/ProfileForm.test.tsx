import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor, within } from 'test-utils';
import ProfileForm, { ProfileFormProps } from './ProfileForm';

function tree(props?: ProfileFormProps) {
  return render(<ProfileForm onProfileSubmit={jest.fn()} {...props} />);
}

function fillInAllFields() {
  const fieldEntries = [
    ['First Name', 'mock-first-name'],
    ['Last Name', 'mock-first-name'],
    ['Company Name', 'mock-company-name'],
    ['Job Title', 'mock-job-title']
  ];

  for (const [name, value] of fieldEntries) {
    userEvent.type(screen.getByLabelText(name), value);
  }

  userEvent.selectOptions(screen.getByLabelText('Company Tax Status'), screen.getByText('Non-profit'));
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

    const jobTitle = screen.getByLabelText('Job Title');

    expect(jobTitle).toBeVisible();
    expect(jobTitle).toHaveValue('');
  });

  it('displays a company name field with empty default', () => {
    tree();

    const companyName = screen.getByLabelText('Company Name');

    expect(companyName).toBeVisible();
    expect(companyName).toHaveValue('');
  });

  it('displays a company tax status selector with non-profit and for-profit values, but no preset value', () => {
    tree();

    const taxStatus = screen.getByLabelText('Company Tax Status');

    expect(taxStatus).toBeVisible();
    expect(taxStatus).toHaveValue('');
    expect(within(taxStatus).getAllByRole('option')).toHaveLength(3); // includes "please select"
    expect(within(taxStatus).getByRole('option', { name: 'Non-profit' })).toBeInTheDocument();
    expect(within(taxStatus).getByRole('option', { name: 'For-profit' })).toBeInTheDocument();
  });

  it('requires that the user enter a value for all fields except job title', async () => {
    const submitButton = () => screen.getByRole('button', { name: 'Finalize Account' });
    const fieldEntries = [
      ['First Name', 'mock-first-name'],
      ['Last Name', 'mock-first-name'],
      ['Company Name', 'mock-company-name']
    ];

    tree();
    expect(submitButton()).toBeDisabled();

    for (const [name, value] of fieldEntries) {
      userEvent.type(screen.getByLabelText(name), value);
      expect(submitButton()).toBeDisabled();
    }

    userEvent.selectOptions(screen.getByLabelText('Company Tax Status'), screen.getByText('Non-profit'));
    expect(submitButton()).not.toBeDisabled();
  });

  it('calls the onProfileSubmit prop with form data when submitted', async () => {
    const onProfileSubmit = jest.fn();

    tree({ onProfileSubmit });
    expect(onProfileSubmit).not.toHaveBeenCalled();
    fillInAllFields();
    userEvent.click(screen.getByRole('button', { name: 'Finalize Account' }));
    await waitFor(() => expect(onProfileSubmit).toBeCalledTimes(1));
    expect(onProfileSubmit.mock.calls).toEqual([
      [
        {
          firstName: 'mock-first-name',
          lastName: 'mock-first-name',
          jobTitle: 'mock-job-title',
          companyName: 'mock-company-name',
          companyTaxStatus: 'nonprofit'
        }
      ]
    ]);
  });

  it('disables the submit button when the disabled prop is true', () => {
    tree({ disabled: true });
    fillInAllFields();
    expect(screen.getByRole('button', { name: 'Finalize Account' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
