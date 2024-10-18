import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useHistory } from 'react-router-dom';
import { render, screen, within } from 'test-utils';

import onLogout from 'components/authentication/logout';
import { USER_ROLE_HUB_ADMIN_TYPE } from 'constants/authConstants';
import { FAQ_URL } from 'constants/helperUrls';

import { SETTINGS } from 'routes';
import AvatarMenu, { AvatarMenuProps } from './AvatarMenu';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn()
}));

jest.mock('components/authentication/logout');

const tree = (props?: AvatarMenuProps) => {
  return render(<AvatarMenu {...props} />);
};

const settingsMenu = 'Settings';

describe('AvatarMenu', () => {
  it('should be enabled if has user', () => {
    tree({ user: { email: 'a@a.com' } as any });
    expect(screen.getByRole('button', { name: settingsMenu })).toBeEnabled();
  });

  it('should be disabled if user is undefined', () => {
    tree();
    expect(screen.getByRole('button', { name: settingsMenu })).toBeEnabled();
  });

  it('should render name initials', () => {
    const nameUser = {
      firstName: 'first-mock',
      lastName: 'last-mock',
      email: 'email@mock.com'
    } as any;
    tree({ user: nameUser });

    const avatar = screen.getByTestId('avatar');
    const title = within(avatar).getByText('FL');
    expect(title).toBeInTheDocument();
  });

  it('should render email initial if name is empty', () => {
    const emailUser = {
      email: 'email@mock.com'
    } as any;
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
    } as any;
    tree({ user: emailUser });

    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    expect(screen.getByRole('menuitem', { name: 'FAQ' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeEnabled();
  });

  it('should show settings section if user is NOT Hub admin & only has 1 org', () => {
    const user = {
      email: 'email@mock.com',
      organizations: [{ id: 'mock-org' }],
      role_type: ['mock-role']
    } as any;
    tree({ user });

    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    expect(screen.getByRole('menuitem', { name: 'Account' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Integrations' })).toBeEnabled();
    expect(screen.getByRole('menuitem', { name: 'Organization' })).toBeEnabled();
  });

  it.each([
    ['Account', SETTINGS.SUBSCRIPTION],
    ['Integrations', SETTINGS.INTEGRATIONS],
    ['Organization', SETTINGS.ORGANIZATION]
  ])('should navigate to %s if respective button is clicked', (menuitem, url) => {
    const user = {
      email: 'email@mock.com',
      organizations: [{ id: 'mock-org' }],
      role_type: ['mock-role']
    } as any;
    const push = jest.fn();
    const historyMock = useHistory as jest.Mock;
    historyMock.mockReturnValue({
      push
    });
    tree({ user });

    expect(push).not.toBeCalled();
    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    userEvent.click(screen.getByRole('menuitem', { name: menuitem }));
    expect(push).toBeCalledWith(url);
  });

  it('should NOT show settings section if user has more than 1 org', () => {
    const user = {
      email: 'email@mock.com',
      organizations: [{ id: 'mock-org' }, { id: 'mock-org-2' }],
      role_type: ['mock-role']
    } as any;
    tree({ user });

    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    expect(screen.queryByRole('menuitem', { name: 'Account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Integrations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Organization' })).not.toBeInTheDocument();
  });

  it('should NOT show settings section if user is Hub admin', () => {
    const user = {
      email: 'email@mock.com',
      organizations: [{ id: 'mock-org' }],
      role_type: [USER_ROLE_HUB_ADMIN_TYPE, 'mock-role']
    } as any;
    tree({ user });

    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    expect(screen.queryByRole('menuitem', { name: 'Account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Integrations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Organization' })).not.toBeInTheDocument();
  });

  it('should have correct FAQ link', () => {
    const oldOpen = jest.spyOn(window, 'open').mockImplementation();
    const emailUser = {
      email: 'email@mock.com'
    } as any;
    tree({ user: emailUser });

    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    userEvent.click(screen.getByRole('menuitem', { name: 'FAQ' }));
    expect(oldOpen).toBeCalledWith(FAQ_URL, '_blank', 'noopener, noreferrer');
    oldOpen.mockRestore();
  });

  it('should logout', () => {
    const emailUser = {
      email: 'email@mock.com'
    } as any;
    tree({ user: emailUser });

    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onLogout).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const user = {
      email: 'email@mock.com',
      organizations: [{ id: 'mock-org' }],
      role_type: ['mock-role']
    } as any;
    const { container } = tree({ user });
    expect(await axe(container)).toHaveNoViolations();

    userEvent.click(screen.getByRole('button', { name: settingsMenu }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
