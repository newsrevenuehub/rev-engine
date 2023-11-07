import { render, screen } from '@testing-library/react';
import { ContributionPage } from 'hooks/useContributionPage';
import ContributionPageI18nProvider from './ContributionPageI18nProvider';
import { createInstance } from 'i18next';

jest.mock('i18next');

jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: any) => <div data-testid="mock-i18next-provider">{children}</div>
}));

function tree(page: Partial<ContributionPage> = {}) {
  return render(<ContributionPageI18nProvider page={{ ...page } as any}>children</ContributionPageI18nProvider>);
}

describe('ContributionPageI18nProvider', () => {
  const createInstanceMock = jest.mocked(createInstance);
  let mockInstance: any;
  let mockInstanceInit: jest.SpyInstance;
  let oldEnv: string | undefined;

  beforeEach(() => {
    oldEnv = process.env.NODE_ENV;

    mockInstanceInit = jest.fn(() => mockInstance);
    mockInstance = {
      init: mockInstanceInit,
      use: jest.fn(() => mockInstance)
    };
    createInstanceMock.mockReturnValue(mockInstance);
  });

  afterEach(() => (process.env.NODE_ENV = oldEnv));

  it('wraps children in a I18nextProvider', () => {
    tree();
    expect(screen.getByTestId('mock-i18next-provider')).toHaveTextContent('children');
  });

  describe('The i18next instance', () => {
    it.each([['en'], ['es']])('uses the correct language when the page locale is %s', (locale) => {
      tree({ locale });
      expect(mockInstanceInit).toBeCalledWith(
        expect.objectContaining({
          lng: locale
        })
      );
    });

    it('falls back to English', () => {
      tree();
      expect(mockInstanceInit).toBeCalledWith(
        expect.objectContaining({
          fallbackLng: 'en'
        })
      );
    });

    it('retrieves translations from the correct path', () => {
      tree();
      expect(mockInstanceInit).toBeCalledWith(
        expect.objectContaining({
          backend: {
            loadPath: '/static/locales/{{lng}}/{{ns}}.json'
          }
        })
      );
    });

    it.each([
      [true, 'development'],
      [false, 'production']
    ])('sets debug mode to %s when in %s mode', (debug, mode) => {
      process.env.NODE_ENV = mode;
      tree();
      expect(mockInstanceInit).toBeCalledWith(
        expect.objectContaining({
          debug
        })
      );
    });
  });
});
