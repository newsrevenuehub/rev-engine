import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ContactInfoPopover, { ContactInfoPopoverProps } from './ContactInfoPopover';

const revenueProgram = {
  contact_phone: '555-555-5555',
  contact_email: 'mock@email.com'
} as any;

function tree(props?: Partial<ContactInfoPopoverProps>) {
  return render(<ContactInfoPopover revenueProgram={revenueProgram} {...props} />);
}

describe('ContactInfoPopover', () => {
  it('shows a button', () => {
    tree();
    expect(screen.getByLabelText('Open contact info')).toBeEnabled();
  });

  it('does not render anything if no contact info', () => {
    tree({ revenueProgram: {} as any });
    expect(document.body.textContent).toBe('');
  });

  it.each(['contact_phone', 'contact_email'])('renders contact info popover if %s is defined', (field) => {
    tree({ revenueProgram: { [field]: 'mock' } as any });
    expect(screen.getByLabelText('Open contact info')).toBeInTheDocument();
  });

  it.each(['contact_phone', 'contact_email'])(
    'does not render contact info popover if %s is an empty string and the other field is undefined',
    (field) => {
      tree({ revenueProgram: { [field]: '' } as any });
      expect(screen.queryByLabelText('Open contact info')).not.toBeInTheDocument();
    }
  );

  it('shows contact info', () => {
    tree();
    const button = screen.getByLabelText('Open contact info');
    fireEvent.click(button);

    expect(screen.getByLabelText('Close contact info')).toBeInTheDocument();
    expect(screen.getByText('Phone:')).toBeInTheDocument();

    const phone = screen.getByRole('link', { name: '555-555-5555' });
    expect(phone).toBeInTheDocument();
    expect(phone).toHaveAttribute('href', 'tel:555-555-5555');

    expect(screen.getByText('Email:')).toBeInTheDocument();
    const email = screen.getByRole('link', { name: 'mock@email.com' });
    expect(email).toBeInTheDocument();
    expect(email).toHaveAttribute('href', 'mailto:mock@email.com');
  });

  it('is accessible when popover is open', async () => {
    const { container } = tree();

    const button = screen.getByLabelText('Open contact info');
    fireEvent.click(button);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
