import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';
import SignInForm, { SignInFormProps } from './SignInForm';

function tree(props?: Partial<SignInFormProps>) {
  return render(
    <div>
      <SignInForm onSubmit={jest.fn()} {...props} />
    </div>
  );
}

describe('SignInForm', () => {
  it("doesn't call onSubmit if email and password are blank", async () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't call onSubmit if email is valid and password is blank", async () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'email@fundjournalism.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(onSubmit).not.toBeCalled();
  });

  it("doesn't call onSubmit if email is invalid and password is valid", async () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText('Password *'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(onSubmit).not.toBeCalled();
  });

  it('calls onSubmit if email and password are valid', async () => {
    const onSubmit = jest.fn();

    tree({ onSubmit });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'email@fundjournalism.org' } });
    fireEvent.change(screen.getByLabelText('Password *'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(onSubmit.mock.calls).toEqual([['email@fundjournalism.org', 'test-password']]);
  });

  it('enables the submit button by default', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('disables the submit button if the disabled prop is true', () => {
    tree({ disabled: true });
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
