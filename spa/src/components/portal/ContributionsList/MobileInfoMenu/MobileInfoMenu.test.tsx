import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import MobileInfoMenu, { MobileInfoMenuProps } from './MobileInfoMenu';

const revenueProgram = {
  contact_phone: '555-555-5555',
  contact_email: 'mock@email.com',
  contributor_portal_show_appeal: true
} as any;

function tree(props?: Partial<MobileInfoMenuProps>) {
  return render(<MobileInfoMenu revenueProgram={revenueProgram} {...props} />);
}

describe('MobileInfoMenu', () => {
  it('shows menu button', () => {
    tree();
    expect(screen.getByLabelText('Open information menu')).toBeEnabled();
  });

  describe.each([
    ['Why giving matters', 'modal-appeal'],
    ['Get help', 'modal-contact-info']
  ])('"%s" menu item', (menuItem, modal) => {
    it('renders menu item', () => {
      tree();

      fireEvent.click(screen.getByLabelText('Open information menu'));
      expect(screen.getByRole('menuitem', { name: menuItem })).toBeInTheDocument();
    });

    it('opens modal when clicked', () => {
      tree();

      fireEvent.click(screen.getByLabelText('Open information menu'));
      fireEvent.click(screen.getByRole('menuitem', { name: menuItem }));

      expect(screen.getByTestId(modal)).toBeInTheDocument();
    });

    it('closes modal', () => {
      tree();

      fireEvent.click(screen.getByLabelText('Open information menu'));
      fireEvent.click(screen.getByRole('menuitem', { name: menuItem }));

      expect(screen.getByTestId(modal)).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Close'));

      expect(screen.queryByTestId(modal)).not.toBeInTheDocument();
    });
  });

  it('does not render appeal menu item if contributor_portal_show_appeal is false', () => {
    tree({ revenueProgram: { ...revenueProgram, contributor_portal_show_appeal: false } });

    fireEvent.click(screen.getByLabelText('Open information menu'));

    expect(screen.queryByRole('menuitem', { name: 'Why giving matters' })).not.toBeInTheDocument();
  });

  it('is accessible when popover is open', async () => {
    const { container } = tree();

    fireEvent.click(screen.getByLabelText('Open information menu'));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
