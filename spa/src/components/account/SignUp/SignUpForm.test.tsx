import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import SignUpForm, { SignUpFormProps } from './SignUpForm';

function tree(props?: Partial<SignUpFormProps>) {
  return render(
    <div>
      <SignUpForm onSubmit={jest.fn()} {...props} />
    </div>
  );
}
describe('SignUpForm', () => {
  it('shows password helper text', () => {
    tree();
    expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
  });

  it("doesn't submit if password is smaller than 8 chars", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText('Password *'), { target: { value: '1234567' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if email and password are blank", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if email is valid but password is blank", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if email is invalid, but password is valid and terms are selected", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByLabelText('Password *'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if email and password are set but invalid, and terms are selected", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'test' } });
    fireEvent.change(screen.getByLabelText('Password *'), { target: { value: 'foo' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if email and password are valid, but terms aren't selected", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText('Password *'), { target: { value: 'password123' } });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onSubmit).not.toBeCalled();
  });

  it('submits if email and password are valid and terms are selected', () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText('Password *'), { target: { value: 'password123' } });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(onSubmit.mock.calls).toEqual([['test@test.com', 'password123']]);
  });

  it('shows a custom email error message if errorMessage.email is set', () => {
    tree({ errorMessage: { email: 'mock-error-message' } });
    expect(screen.getByText('mock-error-message')).toBeInTheDocument();
  });

  it('shows a custom password error message if errorMessage.password is set', () => {
    tree({ errorMessage: { password: 'mock-error-message' } });
    expect(screen.getByText('mock-error-message')).toBeInTheDocument();
  });

  it('enables the submit button by default', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled();
  });

  it('disables the submit button if the disabled prop is true', () => {
    tree({ disabled: true });
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
