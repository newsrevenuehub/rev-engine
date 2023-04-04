import { GOOGLE_FONT_MODS } from 'constants/textConstants';
import WebFont, { Config } from 'webfontloader';
import loadWebFont from './loadWebFont';

jest.mock('webfontloader');

describe('loadWebFont', () => {
  let loadMock: jest.Mock;

  beforeEach(() => {
    loadMock = jest.fn((config: Config) => {
      if (config.active) {
        config.active();
      }
    });
    WebFont.load = loadMock;
  });

  it('resolves after loading a Google font with standard modifications if specified', async () => {
    await loadWebFont({ source: 'google', accessor: 'mock-font-family' });
    expect(loadMock.mock.calls).toEqual([
      [
        expect.objectContaining({
          google: { families: [`mock-font-family:${GOOGLE_FONT_MODS}`] }
        })
      ]
    ]);
  });

  it('resolves after loading a Typekit font if specified', async () => {
    await loadWebFont({ source: 'typekit', accessor: 'mock-font-family' });
    expect(loadMock.mock.calls).toEqual([
      [
        expect.objectContaining({
          typekit: { id: 'mock-font-family' }
        })
      ]
    ]);
  });

  it("does nothing if the font config is for a source that isn't Google or Typekit", async () => {
    await loadWebFont({ source: 'nonexisted', accessor: 'mock-font-family' } as any);
    expect(loadMock).not.toBeCalled();
  });

  it('rejects if loading the font fails', async () => {
    loadMock.mockReset();
    loadMock.mockImplementation((config: Config) => {
      if (config.inactive) {
        config.inactive();
      }
    });

    await expect(() => loadWebFont({ source: 'google', accessor: 'mock-font-family' })).rejects.toBeUndefined();
  });
});
