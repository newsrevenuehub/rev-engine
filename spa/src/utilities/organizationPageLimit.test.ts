import { orgHasPublishPageLimit } from './organizationPageLimit';

const mockPages = [
  {
    id: 'mock-page-id-1',
    name: 'Page 1',
    revenue_program: { name: 'mock-rp', organization: '1' },
    slug: 'mock-rp-page-1'
  },
  {
    id: 'mock-page-id-2',
    name: 'Page 2',
    published_date: new Date().toString(),
    revenue_program: { name: 'mock-rp', organization: '1' },
    slug: 'mock-rp-page-2'
  }
] as any;

describe('orgHasPublishPageLimit', () => {
  it('returns false while pages are loading', () => {
    expect(orgHasPublishPageLimit({ id: '1', plan: { page_limit: 0 } } as any, mockPages)).toBe(false);
  });

  it('returns true if the current organization is under their page limit', async () => {
    expect(orgHasPublishPageLimit({ id: '1', plan: { publish_limit: 2 } } as any, mockPages)).toBe(true);
  });

  it('returns false if the current organization is at their page limit', async () => {
    expect(orgHasPublishPageLimit({ id: '1', plan: { publish_limit: 1 } } as any, mockPages)).toBe(false);
  });

  it('returns false if the current organization is above their page limit', async () => {
    expect(orgHasPublishPageLimit({ id: '1', plan: { publish_limit: 0 } } as any, mockPages)).toBe(false);
  });
});
