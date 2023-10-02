import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ContributionDisclaimer, { ContributionDisclaimerProps } from './ContributionDisclaimer';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: jest.fn()
}));

function tree(props?: Partial<ContributionDisclaimerProps>) {
  return render(<ContributionDisclaimer formattedAmount="mock-formatted-amount" interval="one_time" {...props} />);
}

describe('ContributionDisclaimer', () => {
  const useTranslationMock = jest.mocked(useTranslation);

  beforeEach(() => {
    useTranslationMock.mockReturnValue({
      t: (key: string, options?: Record<string, any>) =>
        `${key}${options?.frequencySuffix?.type ? 'span' : options ? JSON.stringify(options) : ''}`
    } as any);
  });

  it('shows a link to the privacy policy', () => {
    tree();

    const link = screen.getByRole('link', { name: 'common.urlLabels.privacyPolicy' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'common.urls.privacyPolicy');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows a link to terms & conditions', () => {
    tree();

    const link = screen.getByRole('link', { name: 'common.urlLabels.tsAndCs' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'common.urls.tsAndCs');
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
      `donationPage.contributionDisclaimer.contributionIntervals.monthly${JSON.stringify({
        date: format(new Date(), 'do')
      })}`
    );
  });

  it('shows the correct amount and current date for a yearly contribution', () => {
    tree({ interval: 'year' });
    expect(screen.getByTestId('amount')).toHaveTextContent('mock-formatted-amount');
    expect(screen.getByTestId('processingDate')).toHaveTextContent(
      `donationPage.contributionDisclaimer.contributionIntervals.annually${JSON.stringify({
        date: format(new Date(), 'L/d')
      })}`
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
