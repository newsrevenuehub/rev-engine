import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import { USER_ROLE_ORG_ADMIN_TYPE } from 'constants/authConstants';
import MockAdapter from 'axios-mock-adapter';
import axios from 'ajax/axios';

import useUser from 'hooks/useUser';

import Organization from './Organization';

jest.mock('hooks/useUser');

describe('Settings Organization Page', () => {
  const axiosMock = new MockAdapter(axios);
  const useUserMock = useUser as jest.Mock;

  function tree() {
    return render(<Organization />);
  }

  beforeEach(() => {
    useUserMock.mockReturnValue({
      user: {
        role_type: [USER_ROLE_ORG_ADMIN_TYPE],
        organizations: [
          {
            id: 1,
            name: 'mock-org-1'
          }
        ],
        revenue_programs: [
          {
            id: 1,
            fiscal_status: 'nonprofit',
            tax_id: '123456789',
            organization: 1
          }
        ]
      }
    });
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

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

  it('should render Organization Tax Status disclaimer if organization has multiple revenue programs', () => {
    useUserMock.mockReturnValue({
      user: {
        role_type: [USER_ROLE_ORG_ADMIN_TYPE],
        organizations: [
          {
            id: 1,
            name: 'mock-org-1'
          }
        ],
        revenue_programs: [
          {
            id: 1,
            fiscal_status: 'nonprofit',
            tax_id: '123456789',
            organization: 1
          },
          {
            id: 2,
            fiscal_status: 'for-profit',
            tax_id: '000000000',
            organization: 1
          }
        ]
      }
    });
    tree();

    expect(screen.getByText(/Your Organization's tax status and EIN are managed by our Staff./i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'The status is used to calculate fees associated with contributions. For nonprofits, tax ID (EIN) will be included on contributor receipts.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Tax Status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tax Status Nonprofit' })).not.toBeInTheDocument();
    expect(screen.queryByText('EIN')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'EIN Optional' })).not.toBeInTheDocument();
  });

  it('should not render undo/save buttons by default', () => {
    tree();

    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  describe('should render undo/save buttons when:', () => {
    it('org name changes', async () => {
      tree();

      await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
        target: { value: 'Mock-new-name' }
      });

      expect(screen.getByRole('button', { name: /undo/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });

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

  describe('onSubmit: Saving changes', () => {
    it('should call organization patch if organization name has changed', async () => {
      axiosMock.onPatch(`organizations/1/`).reply(200);

      tree();
      expect(axiosMock.history.patch.length).toBe(0);
      await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
        target: { value: 'Mock-new-name' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(axiosMock.history.patch.length).toBe(1);
      });
      expect(axiosMock.history.patch[0].url).toBe(`organizations/1/`);
      expect(axiosMock.history.patch[0].data).toBe('{"name":"Mock-new-name"}');
    });

    it('should call revenue program patch if any other field has changed', async () => {
      axiosMock.onPatch(`revenue-programs/1/`).reply(200);

      tree();
      expect(axiosMock.history.patch.length).toBe(0);

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'For-profit' }));

      await fireEvent.change(screen.getByLabelText('EIN Optional'), { target: { value: '111111111' } });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(axiosMock.history.patch.length).toBe(1);
      });
      expect(axiosMock.history.patch[0].url).toBe(`revenue-programs/1/`);
      expect(axiosMock.history.patch[0].data).toBe('{"tax_id":"111111111","fiscal_status":"for-profit"}');
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
