// Using this approach to typing so can export and iterate over `notificationTypeValues` in
// unit tests. See https://stackoverflow.com/a/64174790.
export const notificationTypeValues = ['success', 'error', 'warning', 'info'] as const;
export type SystemNotificationType = (typeof notificationTypeValues)[number];
