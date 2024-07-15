import { ContributionPage } from 'hooks/useContributionPage';
import { pageLink, portalLink } from './getPageLinks';
import { getRevenueProgramDomain } from './getRevenueProgramDomain';

jest.mock('./getRevenueProgramDomain');

const page = {
  slug: 'page-slug',
  revenue_program: { slug: 'rp-slug ' }
} as ContributionPage;

describe('pageLink', () => {
  const getRevenueProgramDomainMock = jest.mocked(getRevenueProgramDomain);

  it('returns the revenue program domain appended by the page slug', () => {
    getRevenueProgramDomainMock.mockReturnValue('mock-rp-domain');
    expect(pageLink(page)).toBe('mock-rp-domain/page-slug');

    // We need to test that this function was called so that we prove that this
    // function will map custom domains.

    expect(getRevenueProgramDomainMock.mock.calls).toEqual([[page.revenue_program]]);
  });
});

describe('portalLink', () => {
  const getRevenueProgramDomainMock = jest.mocked(getRevenueProgramDomain);

  it('returns the revenue program domain appended by /portal', () => {
    getRevenueProgramDomainMock.mockReturnValue('mock-rp-domain');
    expect(portalLink(page)).toBe('mock-rp-domain/portal');

    // We need to test that this function was called so that we prove that this
    // function will map custom domains.

    expect(getRevenueProgramDomainMock.mock.calls).toEqual([[page.revenue_program]]);
  });
});
