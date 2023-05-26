import { axe } from 'jest-axe';
import { render, screen, waitFor } from 'test-utils';

import userEvent from '@testing-library/user-event';
import AudienceListModal, { AudienceListModalProps } from './AudienceListModal';
import { RevenueProgram } from 'hooks/useContributionPage';
import useRevenueProgram from 'hooks/useRevenueProgram';

jest.mock('hooks/useRevenueProgram');

const revenueProgram = {
  id: 1,
  mailchimp_email_lists: [
    { id: '1', name: 'audience-mock-1' },
    { id: '2', name: 'audience-mock-2' },
    { id: '3', name: 'audience-mock-3' }
  ]
};

describe('AudienceListModal', () => {
  const useRevenueProgramMock = jest.mocked(useRevenueProgram);
  const updateRevenueProgram = jest.fn();

  function tree(props?: Partial<AudienceListModalProps>) {
    return render(<AudienceListModal open={true} revenueProgram={revenueProgram as RevenueProgram} {...props} />);
  }

  beforeEach(() => {
    useRevenueProgramMock.mockReturnValue({
      isLoading: false,
      updateRevenueProgram
    });
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

  it('should call onSelectAudience with selected audience list', async () => {
    tree();
    expect(updateRevenueProgram).not.toBeCalled();
    // "Open" is the aria-label of the autocomplete dropdown button
    userEvent.click(screen.getByRole('button', { name: /Open/i }));
    userEvent.click(screen.getByRole('option', { name: revenueProgram.mailchimp_email_lists[0].name }));
    userEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => updateRevenueProgram.mock.calls.length > 0);
    expect(useRevenueProgramMock).toHaveBeenCalledWith(revenueProgram.id);
    expect(updateRevenueProgram).toHaveBeenCalledWith({
      mailchimp_email_list: revenueProgram.mailchimp_email_lists[0]
    });
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
