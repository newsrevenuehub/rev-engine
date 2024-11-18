import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from 'test-utils';
import { USER_ROLE_ORG_ADMIN_TYPE } from 'constants/authConstants';
import MockAdapter from 'axios-mock-adapter';
import axios from 'ajax/axios';

import { GENERIC_ERROR, ORGANIZATION_SUCCESS_TEXT } from 'constants/textConstants';
import useUser from 'hooks/useUser';

import Organization from './Organization';

jest.mock('components/common/GlobalLoading/GlobalLoading');
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
            fiscal_sponsor_name: '',
            organization: 1
          }
        ]
      }
    });
  });

  afterEach(() => {
    axiosMock.reset();
    jest.resetAllMocks();
  });

  afterAll(() => {
    axiosMock.restore();
    jest.restoreAllMocks();
  });

  it('should render loading if isLoading === true', () => {
    useUserMock.mockReturnValue({ isLoading: true });
    tree();

    expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
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

  it("should disable 'Display Name' & 'Tax ID' fields if user does't have 'org_admin' role", () => {
    useUserMock.mockReturnValue({
      user: {
        role_type: [],
        organizations: [
          {
            id: 1,
            name: 'mock-org-1'
          }
        ],
        revenue_programs: [
          {
            id: 1,
            organization: 1,
            fiscal_status: 'fiscally sponsored',
            tax_id: '123456789',
            fiscal_sponsor_name: ''
          }
        ]
      }
    });
    tree();

    expect(screen.getByRole('textbox', { name: 'Display Name' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'EIN Optional' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tax Status Fiscally Sponsored' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: /fiscal sponsor name/i })).toBeEnabled();
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
              organization: 1,
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
              organization: 1,
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

  it('should render undo/save buttons by default', () => {
    tree();

    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
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

  it('should undo changes when undo is clicked', async () => {
    tree();

    expect(screen.getByRole('textbox', { name: 'Display Name' })).toHaveValue('mock-org-1');
    await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
      target: { value: 'Mock-new-name' }
    });

    expect(screen.getByRole('textbox', { name: 'Display Name' })).toHaveValue('Mock-new-name');
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

    screen.getByRole('button', { name: /undo/i }).click();

    expect(screen.getByRole('textbox', { name: 'Display Name' })).toHaveValue('mock-org-1');
  });

  it('should disable undo/save buttons if user fields are undefined or null', () => {
    useUserMock.mockReturnValue({
      user: {
        role_type: [USER_ROLE_ORG_ADMIN_TYPE],
        organizations: [
          {
            id: 1,
            name: null
          }
        ],
        revenue_programs: [
          {
            id: 1,
            fiscal_status: 'nonprofit',
            tax_id: undefined,
            organization: 1
          }
        ]
      }
    });
    tree();

    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
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

    it('should show success message when patch returns 200', async () => {
      axiosMock.onPatch(`organizations/1/`).reply(200);
      tree();

      expect(screen.queryByText(ORGANIZATION_SUCCESS_TEXT)).not.toBeInTheDocument();
      await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
        target: { value: 'Mock-new-name' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(ORGANIZATION_SUCCESS_TEXT)).toBeVisible();
      });
    });

    it('should show company name API error message when patch returns error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      axiosMock.onPatch(`organizations/1/`).reply(400, { name: ['custom-api-error'] });
      tree();

      expect(screen.queryByText('custom-api-error')).not.toBeInTheDocument();
      await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
        target: { value: 'Mock-new-name' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('custom-api-error')).toBeVisible();
      });
    });

    it('validation error supersedes API error message', async () => {
      axiosMock.onPatch(`organizations/1/`).reply(400, { name: ['custom-api-error'] });
      tree();

      expect(screen.queryByText('custom-api-error')).not.toBeInTheDocument();
      await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
        target: { value: 'Mock-new-name' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('custom-api-error')).toBeVisible();
      });

      await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
        target: { value: '' }
      });

      await waitFor(() => {
        expect(screen.getByText('Display Name is required.')).toBeVisible();
      });
      expect(screen.queryByText('custom-api-error')).not.toBeInTheDocument();
    });

    it('should hide success message when patch returns 200 and user makes any change', async () => {
      axiosMock.onPatch(`organizations/1/`).reply(200);

      tree();
      expect(screen.queryByText(ORGANIZATION_SUCCESS_TEXT)).not.toBeInTheDocument();
      await fireEvent.change(screen.getByRole('textbox', { name: 'Display Name' }), {
        target: { value: 'Mock-new-name' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(ORGANIZATION_SUCCESS_TEXT)).toBeVisible();
      });

      await fireEvent.change(screen.getByLabelText('EIN Optional'), { target: { value: '111111111' } });
      expect(screen.queryByText(ORGANIZATION_SUCCESS_TEXT)).not.toBeInTheDocument();
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
      expect(axiosMock.history.patch[0].data).toBe(
        '{"tax_id":"111111111","fiscal_status":"for-profit","fiscal_sponsor_name":""}'
      );
    });

    it('should not send fiscal_sponsor_name if tax status !== fiscally sponsored', async () => {
      axiosMock.onPatch(`revenue-programs/1/`).reply(200);

      tree();
      expect(axiosMock.history.patch.length).toBe(0);

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally Sponsored' }));

      await fireEvent.change(screen.getByLabelText('Fiscal Sponsor Name'), {
        target: { value: 'mock-sponsor-name' }
      });

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Fiscally Sponsored' }));
      userEvent.click(screen.getByRole('option', { name: 'For-profit' }));

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(axiosMock.history.patch.length).toBe(1);
      });
      expect(axiosMock.history.patch[0].url).toBe(`revenue-programs/1/`);
      expect(axiosMock.history.patch[0].data).toBe(
        '{"tax_id":"123456789","fiscal_status":"for-profit","fiscal_sponsor_name":""}'
      );
    });

    it('should send fiscal_sponsor_name if tax status === fiscally sponsored', async () => {
      axiosMock.onPatch(`revenue-programs/1/`).reply(200);

      tree();
      expect(axiosMock.history.patch.length).toBe(0);

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'Fiscally Sponsored' }));

      await fireEvent.change(screen.getByLabelText('Fiscal Sponsor Name'), {
        target: { value: 'mock-sponsor-name' }
      });

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(axiosMock.history.patch.length).toBe(1);
      });
      expect(axiosMock.history.patch[0].url).toBe(`revenue-programs/1/`);
      expect(axiosMock.history.patch[0].data).toBe(
        '{"tax_id":"123456789","fiscal_status":"fiscally sponsored","fiscal_sponsor_name":"mock-sponsor-name"}'
      );
    });

    it('should show generic error if patch fails', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      axiosMock.onPatch().networkError();

      tree();
      expect(axiosMock.history.patch.length).toBe(0);
      expect(screen.queryByText(GENERIC_ERROR)).not.toBeInTheDocument();

      userEvent.click(screen.getByRole('button', { name: 'Tax Status Nonprofit' }));
      userEvent.click(screen.getByRole('option', { name: 'For-profit' }));

      userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(axiosMock.history.patch.length).toBe(1);
      });
      expect(axiosMock.history.patch[0].url).toBe(`revenue-programs/1/`);
      expect(screen.getByText(GENERIC_ERROR)).toBeVisible();
      errorSpy.mockRestore();
    });
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
