import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';
import useConnectMailchimp from 'hooks/useConnectMailchimp';
import AudienceListModal, { AudienceListModalProps } from './AudienceListModal';

jest.mock('hooks/useConnectMailchimp');

const mockMailchimpStatus = {
  audiences: [
    { id: '1', name: 'audience-mock-1' },
    { id: '2', name: 'audience-mock-2' },
    { id: '3', name: 'audience-mock-3' }
  ],
  connectedToMailchimp: true,
  hasMailchimpAccess: true,
  isError: false,
  isLoading: false,
  requiresAudienceSelection: true,
  recentlyConnectedToMailchimp: false,
  selectAudience: jest.fn(),
  setRefetchInterval: jest.fn()
};

describe('AudienceListModal', () => {
  const useConnectMailchimpMock = jest.mocked(useConnectMailchimp);

  function tree(props?: Partial<AudienceListModalProps>) {
    return render(<AudienceListModal open {...props} />);
  }

  beforeEach(() => {
    useConnectMailchimpMock.mockReturnValue(mockMailchimpStatus);
  });

  it('should render modal', () => {
    tree();
    const modal = screen.getByRole('dialog', { name: `Finish Connection` });
    expect(modal).toBeVisible();
  });

  it('should render modal texts', () => {
    tree();
    expect(screen.getByText('Finish Connection')).toBeVisible();
    expect(
      screen.getByText(
        /You’ve successfully connected to Mailchimp. Select from your Mailchimp audience below to continue and we’ll do the rest!/i
      )
    ).toBeVisible();
  });

  it('should render modal actions', () => {
    tree();
    expect(screen.getByRole('button', { name: /Finish/i })).toBeEnabled();
  });

  it('should render audience list dropdown', () => {
    tree();
    // "Open" is the aria-label of the autocomplete dropdown button
    const input = screen.getByRole('button', { name: /Open/i });
    userEvent.click(input);
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Select your list' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'audience-mock-1' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'audience-mock-2' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'audience-mock-3' })).toBeVisible();
  });

  it('should call selectAudience with selected audience list', async () => {
    const selectAudience = jest.fn();

    useConnectMailchimpMock.mockReturnValue({ ...mockMailchimpStatus, selectAudience });
    tree();
    expect(selectAudience).not.toBeCalled();
    // "Open" is the aria-label of the autocomplete dropdown button
    userEvent.click(screen.getByRole('button', { name: /Open/i }));
    userEvent.click(screen.getByRole('option', { name: mockMailchimpStatus.audiences[0].name }));
    userEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(selectAudience).toBeCalled());
    expect(selectAudience.mock.calls).toEqual([[mockMailchimpStatus.audiences[0].id]]);
  });

  it('should show error if no audience list is selected and "Finish" is clicked', async () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: /Finish/i }));
    await waitFor(() => expect(screen.getByText('Please select an Audience')).toBeVisible());
  });

  it('should show outer error', () => {
    tree({ outerError: 'Outer mock error' });
    expect(screen.getByText('Outer mock error')).toBeVisible();
  });

  it('should not show error message if loading', () => {
    tree({ outerError: 'Outer mock error', loading: true });
    expect(screen.queryByText('Outer mock error')).not.toBeInTheDocument();
  });

  it('should disable create button if loading', () => {
    tree({ loading: true });
    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();

    // "Open" is the aria-label of the autocomplete dropdown button
    userEvent.click(screen.getByRole('button', { name: /Open/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
