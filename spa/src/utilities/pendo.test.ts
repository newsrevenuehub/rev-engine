import { loadPendo } from './pendo';

const mockPendoApiKeyGetter = jest.fn();

jest.mock('appSettings', () => ({
  get PENDO_API_KEY() {
    return mockPendoApiKeyGetter();
  }
}));

describe('loadPendo', () => {
  beforeEach(() => {
    // The Pendo loader script adds a script tag on its own that we need to
    // manually clean up.

    document.body.innerHTML = '';
    mockPendoApiKeyGetter.mockReturnValue('mock-pendo-api-key');
  });

  it('adds the Pendo loader to the document', async () => {
    await loadPendo();
    expect(document.body.querySelector('script')).toBeInTheDocument();
  });

  it("doesn't add the Pendo loader twice even if the hook is invoked twice", async () => {
    // The loader script creates its own script tag so the number of script tags
    // in the DOM may vary. We test by measuring the number of tags in a single
    // invocation, then running it twice.

    await loadPendo();

    const singleScriptCount = document.body.querySelectorAll('script').length;

    document.body.innerHTML = '';
    expect(document.body.querySelectorAll('script').length).toBe(0);
    loadPendo();
    expect(document.body.querySelectorAll('script').length).toBe(singleScriptCount);
  });

  it("throws an error and doesn't add the Pendo loaded if the API key isn't configured", () => {
    mockPendoApiKeyGetter.mockReturnValue('');
    expect(loadPendo).toThrow();
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });
});
