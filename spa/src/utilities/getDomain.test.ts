import { getDomain } from './getDomain';

describe('getDomain', () => {
  it.each([
    ['domain.com', 'domain.com'],
    ['domain.com:1234', 'domain.com:1234'],
    ['subdomain.domain.com', 'domain.com'],
    ['subdomain.domain.com:1234', 'domain.com:1234'],
    ['subdomain.domain.co.uk', 'domain.co.uk'],
    ['subdomain.domain.co.uk:1234', 'domain.co.uk:1234']
  ])('parses %s as %s', (input, expected) => expect(getDomain(input)).toBe(expected));
});
