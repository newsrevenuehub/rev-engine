import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';
import ResetPasswordForm, { ResetPasswordFormProps } from './ResetPasswordForm';

function tree(props?: Partial<ResetPasswordFormProps>) {
  return render(
    <div>
      <ResetPasswordForm onSubmit={jest.fn()} {...props} />
    </div>
  );
}

describe('ResetPasswordForm', () => {
  it("doesn't submit if both passwords are blank", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if one password in blank and other is not blank", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if both passwords are valid and do not match", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'password12#4' } });
    fireEvent.change(screen.getByLabelText('Confirm Password *'), { target: { value: 'password23235' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if both passwords are invalid and do match", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'pwd' } });
    fireEvent.input(screen.getByLabelText('Confirm Password *'), { target: { value: 'pwd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't submit if both passwords are valid and match", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'password12#4' } });
    fireEvent.change(screen.getByLabelText('Confirm Password *'), { target: { value: 'password12#4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(onSubmit.mock.calls).toEqual([['password12#4']]);
  });

  it('enables the submit button by default', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeEnabled();
  });

  it('disables the submit button if the disabled prop is true', () => {
    tree({ disabled: true });
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
