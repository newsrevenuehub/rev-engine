import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from 'test-utils';

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
            tax_id: '123456789',
            fiscal_sponsor_name: ''
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
        'The status is used to calculate fees associated with contributions. For nonprofits, tax ID (EIN) will be included on contributor receipts.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Tax Status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tax Status Nonprofit' })).toBeInTheDocument();
    expect(screen.getByText('EIN')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'EIN Optional' })).toHaveValue('12-3456789');
  });

  it('should render warning message if Tax Status is different from server response', () => {
    tree();

    userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
    userEvent.click(screen.getByRole('option', { name: 'For-profit' }));
    expect(
      screen.getByText(
        'Changing your tax status will affect the fees shown on your contribution pages. Failure to match Stripe tax settings may result in a loss of funds.'
      )
    ).toBeInTheDocument();
  });

  it('should not render warning message by default', () => {
    tree();

    expect(
      screen.queryByText(
        'Changing your tax status will affect the fees shown on your contribution pages. Failure to match Stripe tax settings may result in a loss of funds.'
      )
    ).not.toBeInTheDocument();
  });

  describe('Fiscal Sponsor Name input', () => {
    it('should not render input if tax status != fiscally sponsored', () => {
      tree();

      expect(screen.queryByRole('textbox', { name: /fiscal sponsor name/i })).not.toBeInTheDocument();
    });

    it('should render input if tax status == fiscally sponsored', () => {
      useUserMock.mockReturnValue({
        user: {
          organizations: [
            {
              name: 'mock-org-1',
              fiscal_status: 'fiscally sponsored',
              tax_id: '123456789',
              fiscal_sponsor_name: ''
            }
          ]
        }
      });
      tree();

      expect(screen.getByRole('textbox', { name: /fiscal sponsor name/i })).toBeInTheDocument();
    });

    it('should render input if tax status is changed to fiscally sponsored', () => {
      tree();

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally Sponsored' }));

      expect(screen.getByRole('textbox', { name: /fiscal sponsor name/i })).toBeInTheDocument();
    });

    it('should not render input if tax status is changed from fiscally sponsored to another option', () => {
      useUserMock.mockReturnValue({
        user: {
          organizations: [
            {
              name: 'mock-org-1',
              fiscal_status: 'fiscally sponsored',
              tax_id: '123456789',
              fiscal_sponsor_name: ''
            }
          ]
        }
      });
      tree();

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Fiscally Sponsored' }));
      userEvent.click(screen.getByRole('option', { name: 'Nonprofit' }));

      expect(screen.queryByRole('textbox', { name: /fiscal sponsor name/i })).not.toBeInTheDocument();
    });

    it('should show error message when submitting with empty name', async () => {
      tree();

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally Sponsored' }));
      expect(screen.queryByText(/Fiscal Sponsor Name is required./i)).not.toBeInTheDocument();
      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/Fiscal Sponsor Name is required./i)).toBeInTheDocument();
      });
    });

    it('should show max char error message when name length > 63 chars', async () => {
      tree();

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally Sponsored' }));
      expect(screen.queryByText(/Must be no more than 63 characters/i)).not.toBeInTheDocument();
      await fireEvent.change(screen.getByLabelText('Fiscal Sponsor Name'), {
        target: { value: 'mock-huge-name_mock-huge-name_mock-huge-name_mock-huge-name_mock-huge-name_mock-huge-name' }
      });
      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/Must be no more than 63 characters/i)).toBeInTheDocument();
      });
    });
  });

  it('should not render undo/save buttons by default', () => {
    tree();

    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  describe('should render undo/save buttons when:', () => {
    it('tax status changes', () => {
      tree();

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'For-profit' }));

      expect(screen.getByRole('button', { name: /undo/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });

    it('tax id changes', async () => {
      tree();

      await fireEvent.change(screen.getByLabelText('EIN Optional'), { target: { value: '987654321' } });

      expect(screen.getByRole('button', { name: /undo/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
