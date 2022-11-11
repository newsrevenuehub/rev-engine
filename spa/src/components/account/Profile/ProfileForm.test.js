import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import ProfileForm from './ProfileForm';

function tree(props) {
  return render(<ProfileForm onProfileSubmit={jest.fn()} {...props} />);
}

function fillInAllFields() {
  const fieldEntries = [
    ['First Name', 'mock-first-name'],
    ['Last Name', 'mock-last-name'],
    ['Organization', 'mock-company-name'],
    ['Job Title Optional', 'mock-job-title']
  ];

  for (const [name, value] of fieldEntries) {
    userEvent.type(screen.getByLabelText(name), value);
  }

  userEvent.click(screen.getByRole('button', { name: /Company Tax Status Select your status/i }));
  userEvent.click(screen.getByRole('option', { name: 'Non-profit' }));
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

  it('displays a company tax status selector with non-profit and for-profit values, but no preset value', () => {
    tree();

    const taxStatus = screen.getByRole('button', { name: /Company Tax Status Select your status/i });

    expect(taxStatus).toBeEnabled();
    userEvent.click(taxStatus);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Non-profit' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'For-profit' })).toBeInTheDocument();
  });

  it('requires that the user enter a value for all fields except job title', async () => {
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
    userEvent.click(screen.getByRole('option', { name: 'Non-profit' }));
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
          lastName: 'mock-last-name',
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
