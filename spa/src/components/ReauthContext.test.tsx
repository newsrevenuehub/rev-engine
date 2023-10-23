import ReauthContextProvider, { useReauthContext } from './ReauthContext';
import { render, screen, waitFor } from 'test-utils';

jest.mock('elements/modal/Modal', () => ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => {
  if (!isOpen) return null;

  return <div data-testid="mock-modal">{children}</div>;
});

jest.mock('components/authentication/Login', () => ({ onSuccess }: { onSuccess: () => void }) => {
  return (
    <div data-testid="mock-login">
      <button onClick={onSuccess}>Login</button>
    </div>
  );
});

const callback = jest.fn();

const TestComponent = () => {
  const { getReauth } = useReauthContext();

  return <button onClick={() => getReauth(callback)}>reauth-button</button>;
};

function tree() {
  return render(
    <ReauthContextProvider>
      <TestComponent />
    </ReauthContextProvider>
  );
}

describe('ReauthContext', () => {
  it('renders children', async () => {
    tree();
    expect(screen.getByRole('button', { name: /reauth-button/i })).toBeInTheDocument();
  });

  it('opens ReauthModal when getReauth is clicked', async () => {
    tree();
    screen.getByRole('button', { name: /reauth-button/i }).click();

    await screen.findByTestId('mock-modal');
    expect(screen.getByTestId('mock-login')).toBeVisible();
    expect(callback).not.toHaveBeenCalled();
  });

  it('closes ReauthModal when onSuccess is clicked', async () => {
    tree();
    screen.getByRole('button', { name: /reauth-button/i }).click();

    await screen.findByTestId('mock-modal');

    screen.getByRole('button', { name: /login/i }).click();

    await waitFor(() => expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument());
  });

  it('calls all callbacks when onSuccess is clicked', async () => {
    tree();
    screen.getByRole('button', { name: /reauth-button/i }).click();

    await screen.findByTestId('mock-modal');

    expect(callback).not.toHaveBeenCalled();

    screen.getByRole('button', { name: /login/i }).click();

    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
  });
});
