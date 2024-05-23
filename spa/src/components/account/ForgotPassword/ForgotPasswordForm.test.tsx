import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';
import ForgotPasswordForm, { ForgotPasswordFormProps } from './ForgotPasswordForm';

function tree(props?: Partial<ForgotPasswordFormProps>) {
  return render(<ForgotPasswordForm onSubmit={jest.fn()} disabled={false} {...props} />);
}

describe('ForgotPasswordForm', () => {
  it("doesn't call onSubmit if email is blank", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't call onSubmit if email is invalid", () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: {
        value: 'test'
      }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    expect(onSubmit).not.toBeCalled();
  });

  it('should submit if email is valid', () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: {
        value: 'test@test.com'
      }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    expect(onSubmit.mock.calls).toEqual([['test@test.com']]);
  });

  it('disables the submit button if the disabled prop is true', () => {
    tree({ disabled: true });
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
