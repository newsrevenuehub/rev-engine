import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionDisclaimer, { ContributionDisclaimerProps } from './ContributionDisclaimer';
import { PRIVACY_POLICY_URL, TS_AND_CS_URL } from 'constants/helperUrls';
import { format } from 'date-fns';

function tree(props?: Partial<ContributionDisclaimerProps>) {
  return render(<ContributionDisclaimer formattedAmount="mock-formatted-amount" interval="one_time" {...props} />);
}

describe('ContributionDisclaimer', () => {
  it('shows a link to the privacy policy', () => {
    tree();

    const link = screen.getByRole('link', { name: 'privacy policy' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', PRIVACY_POLICY_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a link to terms & conditions', () => {
    tree();

    const link = screen.getByRole('link', { name: 'terms & conditions' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', TS_AND_CS_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows the correct amount and current date for a one-time contribution', () => {
    tree({ interval: 'one_time' });
    expect(screen.getByTestId('amount')).toHaveTextContent('mock-formatted-amount');
    expect(screen.getByTestId('processingDate')).toHaveTextContent(format(new Date(), 'MMM do, y'));
  });

  it('shows the correct amount and current date for a monthly contribution', () => {
    tree({ interval: 'month' });
    expect(screen.getByTestId('amount')).toHaveTextContent('mock-formatted-amount');
    expect(screen.getByTestId('processingDate')).toHaveTextContent(
      `the ${format(new Date(), 'do')} of the month until you cancel`
    );
  });

  it('shows the correct amount and current date for a yearly contribution', () => {
    tree({ interval: 'year' });
    expect(screen.getByTestId('amount')).toHaveTextContent('mock-formatted-amount');
    expect(screen.getByTestId('processingDate')).toHaveTextContent(
      `${format(new Date(), 'L/d')} yearly until you cancel`
    );
  });

  it('throws an error if given an invalid contribution interval', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => tree({ interval: 'bad' } as any)).toThrow();
    errorSpy.mockRestore();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
