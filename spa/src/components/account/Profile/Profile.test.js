import { render, screen, waitFor } from 'test-utils';
import Profile from './Profile';

jest.mock('components/Main', () => ({
  __esModule: true,
  useUserDataProviderContext: () => ({ userData: { email: 'test@test.com' } })
}));

it('should show profile', () => {
  render(<Profile />);
  //expect(screen.getByTestId('blue-logo')).toBeInTheDocument();
});
