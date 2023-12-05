import { fireEvent, render, screen, waitFor } from 'test-utils';
import SignUpForm, { SignUpFormProps } from './SignUpForm';

const mockSubmit = jest.fn();

describe('SignUpForm Tests', () => {
  function getScreen(props?: Partial<SignUpFormProps>) {
    return render(<SignUpForm onSubmitSignUp={mockSubmit} loading={false} {...props} />);
  }

  it('should have password toggle icon to show/hide value of password if visibility icon is clicked', () => {
    getScreen();
    const password = screen.getByTestId('signup-pwd');
    fireEvent.input(password, {
      target: {
        value: 'test@test.com'
      }
    });
    const toggleIcon = screen.getByTestId('toggle-password');
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual('text');
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual('password');
  });

  it('should show password helper text', async () => {
    getScreen();
    expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show password error message if password is smaller than 8 chars', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId('signup-email'), {
      target: {
        value: 'test@test.com'
      }
    });
    fireEvent.input(screen.getByTestId('signup-pwd'), {
      target: {
        value: '1234567'
      }
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters long.')
    );
  });

  it('should not submit if email and password are blank', async () => {
    getScreen();
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is valid and password is blank.', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId('signup-email'), {
      target: {
        value: 'test@test.com'
      }
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is invalid and password is valid and terms are selected', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId('signup-pwd'), {
      target: {
        value: 'password123'
      }
    });
    fireEvent.input(screen.getByTestId('signup-email'), {
      target: {
        value: 'test'
      }
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findAllByRole('alert')).toHaveLength(1);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email and password are set but invalid, and terms are selected', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId('signup-pwd'), {
      target: {
        value: 'foo'
      }
    });
    fireEvent.input(screen.getByTestId('signup-email'), {
      target: {
        value: 'test'
      }
    });

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email and password are valid, and terms are not selected', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId('signup-pwd'), {
      target: {
        value: 'foo#1234'
      }
    });
    fireEvent.input(screen.getByTestId('signup-email'), {
      target: {
        value: 'test@test.com'
      }
    });

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should submit if email and password are valid and terms are selected', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId('signup-pwd'), {
      target: {
        value: 'foo#$%123'
      }
    });
    fireEvent.input(screen.getByTestId('signup-email'), {
      target: {
        value: 'test@test.com'
      }
    });

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(screen.queryAllByRole('alert')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });

  it('should show custom email error message if errorMessage.email is set', () => {
    getScreen({ errorMessage: { email: 'mock-error-message' } });
    expect(screen.getByText('mock-error-message')).toBeInTheDocument();
  });
  it('should show custom password error message if errorMessage.password is set', () => {
    getScreen({ errorMessage: { password: 'mock-error-message' } });
    expect(screen.getByText('mock-error-message')).toBeInTheDocument();
  });
});
