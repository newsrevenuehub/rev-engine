import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor, fireEvent } from 'test-utils';
import ProfileForm, { ProfileFormProps } from './ProfileForm';

const onProfileSubmit = jest.fn();

function tree(props?: ProfileFormProps) {
  return render(<ProfileForm onProfileSubmit={onProfileSubmit} {...props} />);
}

async function fillInAllFields() {
  const fieldEntries = [
    ['First Name', 'mock-first-name'],
    ['Last Name', 'mock-last-name'],
    ['Company Name', 'mock-company-name'],
    ['Job Title Optional', 'mock-job-title']
  ];

  for (const [name, value] of fieldEntries) {
    userEvent.type(screen.getByLabelText(name), value);
  }

  await fireEvent.change(screen.getByLabelText('EIN Optional'), { target: { value: '987654321' } });

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

  it('displays a company name field with empty default', () => {
    tree();

    const companyName = screen.getByLabelText('Company Name');

    expect(companyName).toBeVisible();
    expect(companyName).toHaveValue('');
  });

  it('displays a EIN (tax id) field with empty default', () => {
    tree();

    const taxId = screen.getByLabelText('EIN Optional');
    expect(taxId).toBeVisible();
    expect(taxId).toHaveValue('');
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

  it('requires that the user enter a value for all fields except job title & tax id', async () => {
    const submitButton = () => screen.getByRole('button', { name: 'Finalize Account' });
    const fieldEntries = [
      ['First Name', 'mock-first-name'],
      ['Last Name', 'mock-last-name'],
      ['Company Name', 'mock-company-name']
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
          taxId: '98-7654321'
        }
      ]
    ]);
  });

  it('disables the submit button when the disabled prop is true', async () => {
    tree({ disabled: true, onProfileSubmit });
    await fillInAllFields();
    expect(screen.getByRole('button', { name: 'Finalize Account' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
