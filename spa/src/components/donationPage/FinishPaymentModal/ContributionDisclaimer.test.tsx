import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionDisclaimer, { ContributionDisclaimerProps } from './ContributionDisclaimer';

function tree(props?: Partial<ContributionDisclaimerProps>) {
  // We use a stable processing date to ensure format strings are correct.

  return render(
    <ContributionDisclaimer
      formattedAmount="mock-formatted-amount"
      interval="one_time"
      processingDate={new Date(2001, 0, 15)}
      {...props}
    />
  );
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

  describe('In the default English locale', () => {
    it('shows the correct amount and current date for a one-time contribution', () => {
      tree({ interval: 'one_time' });

      expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.one_time').dataset.values).toBe(
        JSON.stringify({ amount: 'mock-formatted-amount', date: 'Jan 15, 2001' })
      );
    });

    it('shows the correct amount and current date for a monthly contribution', () => {
      tree({ interval: 'month' });

      // Date is handled through variations on the translation key done by
      // i18next.

      expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.month').dataset.values).toBe(
        JSON.stringify({ amount: 'mock-formatted-amount' })
      );
    });

    it('shows the correct amount and current date for a yearly contribution', () => {
      tree({ interval: 'year' });

      expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.year').dataset.values).toBe(
        JSON.stringify({ amount: 'mock-formatted-amount', date: '1/15' })
      );
    });
  });

  describe('In the Spanish locale', () => {
    it('shows the correct amount and current date for a one-time contribution', () => {
      tree({ interval: 'one_time', locale: 'es' });

      expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.one_time').dataset.values).toBe(
        JSON.stringify({ amount: 'mock-formatted-amount', date: '15 ene 2001' })
      );
    });

    it('shows the correct amount and current date for a monthly contribution', () => {
      tree({ interval: 'month', locale: 'es' });

      // Date is handled through variations on the translation key done by
      // i18next.

      expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.month').dataset.values).toBe(
        JSON.stringify({ amount: 'mock-formatted-amount' })
      );
    });

    it('shows the correct amount and current date for a yearly contribution', () => {
      tree({ interval: 'year', locale: 'es' });

      expect(screen.getByTestId('donationPage.contributionDisclaimer.authorizePayment.year').dataset.values).toBe(
        JSON.stringify({ amount: 'mock-formatted-amount', date: '15/1' })
      );
    });
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
