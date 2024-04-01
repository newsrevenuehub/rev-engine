import { getRevenueProgramSlug } from './getRevenueProgramSlug';

const mockMap = jest.fn();

jest.mock('appSettings', () => ({
  get HOST_MAP() {
    return mockMap();
  }
}));

describe('getRevenueProgramSlug', () => {
  beforeEach(() => {
    mockMap.mockReturnValue({ 'host-name': 'test-slug' });
  });

  describe.each([
    ['when the hostname has no port', ''],
    ['when the hostname has a port', ':1234']
  ])('%s', (_, suffix) => {
    it('maps the hostname if it exists in the host map', () =>
      expect(getRevenueProgramSlug(`host-name${suffix}`)).toBe('test-slug'));

    it("returns the first subdomain of a hostname if it doesn't exist in the host map", () =>
      expect(getRevenueProgramSlug(`rp-slug.host-name.org${suffix}`)).toBe('rp-slug'));

    it('returns the first subdomain of a hostname if the host map is not defined', () => {
      mockMap.mockReturnValue(undefined);
      expect(getRevenueProgramSlug(`rp-slug.host-name.org${suffix}`)).toBe('rp-slug');
    });

    it("returns the first subdomain of a hostname if the host map isn't valid JSON", () => {
      mockMap.mockReturnValue('bad');
      expect(getRevenueProgramSlug(`rp-slug.host-name.org${suffix}`)).toBe('rp-slug');
    });

    it('returns an empty string if passed a hostname without a subdomain', () =>
      expect(getRevenueProgramSlug(`no-subdomain.org${suffix}`)).toBe(''));

    it('returns just the first subdomain if passed a hostname with multiple subdomains', () =>
      expect(getRevenueProgramSlug(`rp-slug.subdomain.host-name.org${suffix}`)).toBe('rp-slug'));
  });
});
