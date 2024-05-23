import { getRevenueProgramDomain } from './getRevenueProgramDomain';

const mockMap = jest.fn();

jest.mock('appSettings', () => ({
  get HOST_MAP() {
    return mockMap();
  }
}));

describe('getRevenueProgramDomain', () => {
  beforeEach(() => {
    mockMap.mockReturnValue({ 'host-name': 'test-slug' });
  });

  it('returns the mapped domain if it is set in HOST_MAP', () =>
    expect(getRevenueProgramDomain({ slug: 'test-slug' } as any)).toBe('host-name'));

  it("returns the RP slug suffixed by the current domain if it's not set in HOST_MAP", () =>
    expect(getRevenueProgramDomain({ slug: 'other-slug' } as any)).toBe('other-slug.localhost'));

  it('returns the RP slug suffixed by the current domain if HOST_MAP is undefined', () => {
    mockMap.mockReturnValue(undefined);
    expect(getRevenueProgramDomain({ slug: 'test-slug' } as any)).toBe('test-slug.localhost');
  });

  it('returns the RP slug suffixed by the current domain if HOST_MAP is empty', () => {
    mockMap.mockReturnValue({});
    expect(getRevenueProgramDomain({ slug: 'test-slug' } as any)).toBe('test-slug.localhost');
  });
});
