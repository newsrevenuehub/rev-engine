import { defaultEmailContent } from './defaultContent';

describe('defaultEmailContent', () => {
  it('returns the correct value for contribution_receipt -> message', () => {
    expect(defaultEmailContent('contribution_receipt', 'message', { name: 'test-rp-name' } as any)).toBe(
      '<p>Thank you for supporting test-rp-name.</p>'
    );
  });
});
