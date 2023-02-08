import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import useUser from 'hooks/useUser';

import Organization from './Organization';

jest.mock('hooks/useUser');

describe('Settings Organization Page', () => {
  const useUserMock = useUser as jest.Mock;

  function tree() {
    return render(<Organization />);
  }

  beforeEach(() => {
    useUserMock.mockReturnValue({
      user: {
        organizations: [
          {
            name: 'mock-org-1',
            fiscal_status: 'nonprofit',
            tax_id: '123456789'
          }
        ]
      }
    });
  });

  it('should render page texts', () => {
    tree();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Update your Organization details and settings here.')).toBeInTheDocument();
  });

  it('should render Organization Name section', () => {
    tree();

    expect(screen.getByText('Organization Name')).toBeInTheDocument();
    expect(screen.getByText('This will update the name displayed in the navigation menu.')).toBeInTheDocument();
    expect(screen.getByText('Display Name')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Display Name' })).toHaveValue('mock-org-1');
  });

  it('should render Organization Tax Status section', () => {
    tree();

    expect(screen.getByText('Organization Tax Status')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The status is used to calculate fees associated with contributions. For non-profits, tax ID (EIN) will be included on contributor receipts.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Tax Status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tax Status Non-profit' })).toBeInTheDocument();
    expect(screen.getByText('EIN')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'EIN Optional' })).toHaveValue('12-3456789');
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
