import { axe } from 'jest-axe';
import { render, screen, within } from 'test-utils';
import userEvent from '@testing-library/user-event';

import onLogout from 'components/authentication/logout';
import AvatarMenu, { AvatarMenuProps, urlFAQ } from './AvatarMenu';

jest.mock('components/authentication/logout', () => ({
  __esModule: true,
  default: jest.fn()
}));


const tree = (props?: AvatarMenuProps) => {
  return render(<AvatarMenu {...props} />);
}

describe('AvatarMenu', () => {
  it('should be enabled if has user', () => {
    tree({ user: { email: 'a@a.com' } });
    expect(screen.getByRole('button', { name: 'setting menu' })).toBeEnabled();
  });

  it('should be disabled if user is undefined', () => {
    tree();
    expect(screen.getByRole('button', { name: 'setting menu' })).toBeEnabled();
  });

  it('should render name initials', () => {
    const nameUser = {
      firstName: 'first-mock',
      lastName: 'last-mock',
      email: 'email@mock.com'
    }
    tree({ user: nameUser });

    const avatar = screen.getByTestId('avatar');
    const title = within(avatar).getByText('FL');
    expect(title).toBeInTheDocument();
  });

  it('should render email initial if name is empty', () => {
    const emailUser = {
      email: 'email@mock.com'
    }
    tree({ user: emailUser });

    const avatar = screen.getByTestId('avatar');
    expect(avatar.innerHTML).toBe('E');
    const title = within(avatar).getByText('E');
    expect(title).toBeInTheDocument();
  });

  it('should render nothing if user is undefined', () => {
    tree();

    const avatar = screen.getByTestId('avatar');
    expect(avatar.innerHTML).toBe('');
  });

  it('should open settings menu with correct buttons', () => {
    const emailUser = {
      email: 'email@mock.com'
    }
    tree({ user: emailUser });

    userEvent.click(screen.getByRole('button', { name: 'setting menu' }));
    expect(screen.getByRole('menuitem', { name: 'FAQ' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeEnabled();
  });

  it('should have correct FAQ link', () => {
    window.open = jest.fn()

    const emailUser = {
      email: 'email@mock.com'
    }
    tree({ user: emailUser });

    userEvent.click(screen.getByRole('button', { name: 'setting menu' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'FAQ' }));
    expect(window.open).toBeCalledWith(urlFAQ, "_blank", "noopener, noreferrer")
  });

  it('should logout', () => {
    const emailUser = {
      email: 'email@mock.com'
    }
    tree({ user: emailUser });

    userEvent.click(screen.getByRole('button', { name: 'setting menu' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onLogout).toBeCalledTimes(1)
  });

  it('is accessible', async () => {
    const { container } = tree({ user: { email: 'a@a.com' } });
    expect(await axe(container)).toHaveNoViolations();

    userEvent.click(screen.getByRole('button', { name: 'setting menu' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
