import { axe } from 'jest-axe';

import { render, screen, fireEvent } from 'test-utils';
import { notificationTypeValues } from './commonTypes';

import SystemNotification, { SystemNotificationProps } from './SystemNotification';

function tree(props?: Partial<SystemNotificationProps>) {
  return render(
    <SystemNotification
      type={notificationTypeValues[0]}
      handleClose={jest.fn()}
      children="This is the body"
      header="Notification header!"
      {...props}
    />
  );
}

describe('SystemNotification', () => {
  it.each(notificationTypeValues)('should be accessible when type is %p', async (notificationType) => {
    const { container } = tree({ type: notificationType });
    expect(await axe(container)).toHaveNoViolations();
  });
  it.each(notificationTypeValues)("should call 'handleClose' callback when type is %p", async (notificationType) => {
    const handleClose = jest.fn();
    tree({ handleClose });
    fireEvent.click(screen.getByRole('button', { name: 'close notification' }));
    expect(handleClose).toBeCalledTimes(1);
  });
  it.each(notificationTypeValues)('should render "header" text when type is %p', async (notificationType) => {
    const header = 'Notification header!';
    tree({ header });
    expect(screen.getByRole('heading', { level: 2, name: header })).toBeVisible();
  });
  it.each(notificationTypeValues)('should render "body" text when type is %p', async (notificationType) => {
    const children = 'Notwithstanding Descartes, you are because of me.';
    tree({ children });
    expect(screen.getByText(children)).toBeVisible();
  });
});
