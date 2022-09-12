import { render, screen, fireEvent, waitFor } from 'test-utils';
import SignUpForm from './SignUpForm';
import ReactTestUtils from 'react-dom/test-utils';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('SignUpForm Tests', () => {
  function getScreen() {
    return render(<SignUpForm onSubmitSignUp={mockSubmit} loading={false} />);
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
    expect(password.getAttribute('type')).toEqual(Input.types.TEXT);
    fireEvent.click(toggleIcon);
    expect(password.getAttribute('type')).toEqual(Input.types.PASSWORD);
  });

  it('should not submit if email and password are blank', async () => {
    getScreen();
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).not.toBeCalled();
  });

  it('should not submit if email is valid and password is blank.', async () => {
    getScreen();
    fireEvent.input(screen.getByTestId('signup-email'), {
      target: {
        value: 'test@test.com'
      }
    });
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
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
    const inp = screen.getByTestId('acceptTermsCheckbox').querySelector('input[type="checkbox"]');
    ReactTestUtils.Simulate.change(inp, { target: { checked: true } });
    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    expect(await screen.findAllByRole('error')).toHaveLength(1);
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

    const inp = screen.getByTestId('acceptTermsCheckbox').querySelector('input[type="checkbox"]');
    ReactTestUtils.Simulate.change(inp, { target: { checked: true } });

    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    expect(await screen.findAllByRole('error')).toHaveLength(2);
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

    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
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

    const inp = screen.getByTestId('acceptTermsCheckbox').querySelector('input[type="checkbox"]');
    ReactTestUtils.Simulate.change(inp, { target: { checked: true } });

    fireEvent.submit(screen.getByRole('button', { type: 'submit' }));
    await waitFor(() => expect(screen.queryAllByRole('error')).toHaveLength(0));
    expect(mockSubmit).toBeCalled();
  });
});
