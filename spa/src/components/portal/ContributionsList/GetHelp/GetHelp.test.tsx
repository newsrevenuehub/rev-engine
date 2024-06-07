import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import GetHelp, { GetHelpProps } from './GetHelp';

const defaultProps = {
  contact_phone: '555-555-5555',
  contact_email: 'mock@email.com'
} as any;

function tree(props?: Partial<GetHelpProps>) {
  return render(<GetHelp {...defaultProps} {...props} />);
}

describe('GetHelp', () => {
  it.each([
    ['contact_phone', 'Phone'],
    ['contact_email', 'Email']
  ])('does not render %s if it is an empty string', (field, label) => {
    tree({ [field]: '' });
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  });

  it.each([
    ['contact_phone', 'Phone'],
    ['contact_email', 'Email']
  ])('does not render %s if it is undefined', (field, label) => {
    tree({ [field]: undefined });
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  });

  it('renders contact info', () => {
    tree();

    expect(screen.getByText('Phone:')).toBeInTheDocument();
    const phone = screen.getByRole('link', { name: '555-555-5555' });
    expect(phone).toBeInTheDocument();
    expect(phone).toHaveAttribute('href', 'tel:555-555-5555');

    expect(screen.getByText('Email:')).toBeInTheDocument();
    const email = screen.getByRole('link', { name: 'mock@email.com' });
    expect(email).toBeInTheDocument();
    expect(email).toHaveAttribute('href', 'mailto:mock@email.com');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
