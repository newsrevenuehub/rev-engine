import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import EmailBlock, { EmailBlockProps } from './EmailBlock';

function tree(props?: Partial<EmailBlockProps>) {
  return render(<EmailBlock name="test-name" description="test-description" {...props} />);
}

describe('EmailBlock', () => {
  it('shows the name prop', () => {
    tree();
    expect(screen.getByRole('heading', { name: 'test-name' })).toBeVisible();
  });

  it('shows the description', () => {
    tree();
    expect(screen.getByText('test-description')).toBeVisible();
  });

  it('shows a button to send a test email if onSendTest is set', () => {
    const onSendTest = jest.fn();

    tree({ onSendTest });
    expect(onSendTest).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send Test Email' }));
    expect(onSendTest).toBeCalledTimes(1);
  });

  it('disables the send test email button if onSendTest is undefined', () => {
    tree();
    expect(screen.getByRole('button', { name: 'Send Test Email' })).toBeDisabled();
  });

  it.each([
    ['View', false],
    ['View & Edit', true]
  ])('shows a disabled %s button if the editable prop is %s', (name, editable) => {
    tree({ editable });
    expect(screen.getByRole('button', { name })).toBeDisabled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
