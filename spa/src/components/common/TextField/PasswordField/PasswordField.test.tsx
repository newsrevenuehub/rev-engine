import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import PasswordField, { PasswordFieldProps } from './PasswordField';

function tree(props?: Partial<PasswordFieldProps>) {
  return render(<PasswordField id="password" label="Password" {...props} />);
}

describe('PasswordField', () => {
  // Password fields don't have roles, so we have to locate the field indirectly
  // when its type is `password`.

  it('shows a password field by default', () => {
    tree();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('toggles from password to visible and maintains value when the show button is clicked', () => {
    tree({ value: 'test-value' });
    expect(screen.getByLabelText('Password')).toHaveValue('test-value');
    fireEvent.click(screen.getByRole('button', { name: 'Show Password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Password')).toHaveValue('test-value');
  });

  it('uses the visibleFieldType prop if set when showing the value', () => {
    tree({ visibleFieldType: 'email', value: 'test-value' });
    expect(screen.getByLabelText('Password')).toHaveValue('test-value');
    fireEvent.click(screen.getByRole('button', { name: 'Show Password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveValue('test-value');
  });

  it('toggles from visible to password and maintains value when the hide button is clicked', () => {
    tree({ value: 'test-value' });
    fireEvent.click(screen.getByRole('button', { name: 'Show Password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide Password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveValue('test-value');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
