import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionDisclaimer, { ContributionDisclaimerProps } from './ContributionDisclaimer';
import { format } from 'date-fns';

function tree(props?: Partial<ContributionDisclaimerProps>) {
  return render(<ContributionDisclaimer formattedAmount="mock-formatted-amount" interval="one_time" {...props} />);
}

describe('ContributionDisclaimer', () => {
  it('shows a link to the privacy policy', () => {
    tree();

    const link = screen.getAllByRole('link').find((link) => link.getAttribute('href') === 'common.urls.privacyPolicy');

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'common.urls.privacyPolicy');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a link to terms & conditions', () => {
    tree();

    const link = screen.getAllByRole('link').find((link) => link.getAttribute('href') === 'common.urls.tsAndCs');

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'common.urls.tsAndCs');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows the correct amount and current date for a one-time contribution', () => {
    tree({ interval: 'one_time' });

    expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.one_time').dataset.values).toBe(
      JSON.stringify({
        amountText: 'mock-formatted-amount',
        date: format(new Date(), 'MMM do, y')
      })
    );
  });

  it('shows the correct amount and current date for a monthly contribution', () => {
    tree({ interval: 'month' });

    expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.month').dataset.values).toBe(
      JSON.stringify({
        amountText: 'mock-formatted-amount,',
        date: format(new Date(), 'do')
      })
    );
  });

  it('shows the correct amount and current date for a yearly contribution', () => {
    tree({ interval: 'year' });

    expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.year').dataset.values).toBe(
      JSON.stringify({
        amountText: 'mock-formatted-amount,',
        date: format(new Date(), 'L/d')
      })
    );
  });

  it('throws an error if given an invalid contribution interval', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => tree({ interval: 'bad' } as any)).toThrow();
    errorSpy.mockRestore();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(
      await axe(container, {
        rules: {
          // Need to disable because of i18n <Trans/> mock component
          'link-name': { enabled: false }
        }
      })
    ).toHaveNoViolations();
  });
});
