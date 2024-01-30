import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionDetail, { ContributionDetailProps } from './ContributionDetail';
import { usePortalContribution } from 'hooks/usePortalContribution';

jest.mock('hooks/usePortalContribution');
jest.mock('./BillingDetails');
jest.mock('./BillingHistory');
jest.mock('./MobileHeader');
jest.mock('./PaymentMethod');
jest.mock('./Actions');

function tree(props?: Partial<ContributionDetailProps>) {
  return render(<ContributionDetail contributionId={1} contributorId={123} {...props} />);
}

describe('ContributionDetail', () => {
  const usePortalContributionMock = jest.mocked(usePortalContribution);

  it('fetches the contribution matching the contributor and contribution ID in props', () => {
    usePortalContributionMock.mockReturnValue({
      isLoading: true,
      contribution: undefined,
      isError: false,
      isFetching: false,
      refetch: jest.fn(),
      cancelContribution: jest.fn()
    });

    tree();
    expect(usePortalContributionMock).toBeCalledWith(123, 1);
  });

  describe('While the contribution is loading', () => {
    beforeEach(() => {
      usePortalContributionMock.mockReturnValue({
        isLoading: true,
        contribution: undefined,
        isError: false,
        isFetching: false,
        refetch: jest.fn(),
        cancelContribution: jest.fn()
      });
    });

    it('shows a spinner', () => {
      tree();
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('If an error occurs while loading the contribution', () => {
    beforeEach(() => {
      usePortalContributionMock.mockReturnValue({
        isLoading: false,
        contribution: undefined,
        isError: true,
        isFetching: false,
        refetch: jest.fn(),
        cancelContribution: jest.fn()
      });
    });

    it('shows an error message', () => {
      tree();
      expect(screen.getByText('Error loading contribution detail.')).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When the contribution has loaded', () => {
    const mockContribution = {
      id: 1,
      payments: [{ mock: true }]
    };

    beforeEach(() => {
      usePortalContributionMock.mockReturnValue({
        isLoading: false,
        contribution: mockContribution as any,
        isError: false,
        isFetching: false,
        refetch: jest.fn(),
        cancelContribution: jest.fn()
      });
    });

    it.each([['mobile header'], ['billing details'], ['payment method'], ['actions']])('shows the %s', (name) => {
      tree();

      const component = screen.getByTestId(`mock-${name.replace(' ', '-')}`);

      expect(component).toBeInTheDocument();
      expect(component.dataset.contribution).toBe(`${mockContribution.id}`);
    });

    it('shows the billing history', () => {
      tree();

      const history = screen.getByTestId('mock-billing-history');

      expect(history.dataset.payments).toBe(JSON.stringify(mockContribution.payments));
    });

    it('calls cancelContribution when the cancel button is clicked', () => {
      const cancelContribution = jest.fn();
      usePortalContributionMock.mockReturnValue({
        isLoading: false,
        contribution: mockContribution as any,
        isError: false,
        isFetching: false,
        refetch: jest.fn(),
        cancelContribution
      });

      tree();
      const cancelButton = screen.getByText('Cancel Contribution');
      cancelButton.click();

      expect(cancelContribution).toBeCalledWith(mockContribution.id);
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
