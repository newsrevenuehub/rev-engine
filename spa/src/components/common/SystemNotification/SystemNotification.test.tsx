import { axe } from 'jest-axe';

import { render, screen, fireEvent } from 'test-utils';
import { useSnackbar } from 'notistack';

import { notificationTypeValues } from './commonTypes';

import SystemNotification, { SystemNotificationProps } from './SystemNotification';

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: jest.fn()
}));

function tree(props?: Partial<SystemNotificationProps>) {
  return render(
    <SystemNotification
      type={notificationTypeValues[0]}
      id="mock-id"
      message="This is the body"
      header="Notification header!"
      {...props}
    />
  );
}

describe('SystemNotification', () => {
  const useSnackbarMock = useSnackbar as jest.Mock;
  const closeSnackbar = jest.fn();

  beforeEach(() => {
    useSnackbarMock.mockReturnValue({ closeSnackbar });
  });

  it.each(notificationTypeValues)('should be accessible when type is %p', async (notificationType) => {
    const { container } = tree({ type: notificationType });
    expect(await axe(container)).toHaveNoViolations();
  });
  it.each(notificationTypeValues)("should call 'handleClose' callback when type is %p", async () => {
    tree();
    fireEvent.click(screen.getByRole('button', { name: 'close notification' }));
    expect(closeSnackbar).toBeCalledWith('mock-id');
  });
  it.each(notificationTypeValues)('should render "header" text when type is %p', async () => {
    const header = 'Notification header!';
    tree({ header });
    expect(screen.getByRole('heading', { level: 2, name: header })).toBeVisible();
  });
  it.each(notificationTypeValues)('should render "body" text when type is %p', async () => {
    const message = 'Notwithstanding Descartes, you are because of me.';
    tree({ message });
    expect(screen.getByText(message)).toBeVisible();
  });
});
