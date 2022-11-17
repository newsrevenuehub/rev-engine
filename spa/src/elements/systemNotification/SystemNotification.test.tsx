import { axe } from 'jest-axe';
import { screen, fireEvent } from '@testing-library/react';

import { render } from 'test-utils';
import { notificationTypeValues } from './commonTypes';

import SystemNotification from './SystemNotification';

describe('SystemNotification', () => {
  it.each(notificationTypeValues)('should be accessible when type is %p', async (notificationType) => {
    const { container } = render(
      <SystemNotification
        type={notificationType}
        header="Notification header!"
        body="This is the body."
        handleClose={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
  it.each(notificationTypeValues)("should call 'handleClose' callback when type is %p", async (notificationType) => {
    const handleClose = jest.fn();
    render(
      <SystemNotification type={notificationType} header="Notification header" body="" handleClose={handleClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'close notification' }));
    expect(handleClose).toBeCalledTimes(1);
  });
  it.each(notificationTypeValues)('should render "header" text when type is %p', async (notificationType) => {
    const header = 'Notification header!';
    render(
      <SystemNotification type={notificationType} header={header} body="This is the body." handleClose={() => {}} />
    );
    expect(screen.getByRole('heading', { level: 2, name: header })).toBeVisible();
  });
  it.each(notificationTypeValues)('should render "body" text when type is %p', async (notificationType) => {
    const body = 'Notwithstanding Descartes, you are because of me.';
    render(
      <SystemNotification type={notificationType} header="Notification header" body={body} handleClose={() => {}} />
    );
    expect(screen.getByText(body)).toBeVisible();
  });
});
