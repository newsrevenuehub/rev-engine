import { render, waitFor } from 'test-utils';
import { loadPendo } from 'utilities/pendo';
import { usePortalPendo } from './usePortalPendo';
import { Contributor, usePortalAuthContext } from './usePortalAuth';
import usePortal from './usePortal';

jest.mock('utilities/pendo');
jest.mock('./useConnectMailchimp');
jest.mock('./useConnectStripeAccount');
jest.mock('./useUser');
jest.mock('./usePortal');
jest.mock('./usePortalAuth');

const mockPendoVisitorPrefixGetter = jest.fn();

jest.mock('appSettings', () => ({
  get PENDO_VISITOR_PREFIX() {
    return mockPendoVisitorPrefixGetter();
  }
}));

const mockContributor: Contributor = {
  created: 'mock-created',
  email: 'mock-contributor-email',
  id: 1,
  modified: 'mock-modified',
  uuid: 'mock-contributor-uuid'
};

const TestHookConsumer = () => {
  usePortalPendo();
  return null;
};

function tree() {
  render(<TestHookConsumer />);
}

describe('usePendo', () => {
  const loadPendoMock = jest.mocked(loadPendo);
  const usePortalAuthContextMock = jest.mocked(usePortalAuthContext);
  const usePortalMock = jest.mocked(usePortal);
  let initializeMock: jest.SpyInstance;

  beforeEach(() => {
    mockPendoVisitorPrefixGetter.mockReturnValue('mock-pendo-visitor-prefix');
    usePortalAuthContextMock.mockReturnValue({ contributor: mockContributor });
    usePortalMock.mockReturnValue({
      page: { revenue_program: { id: 'mock-rp-id' } } as any,
      pageIsFetched: true,
      isPageError: false,
      isPageLoading: false,
      pageError: undefined,
      enablePageFetch: false,
      sendMagicLink: jest.fn(),
      magicLinkIsLoading: false,
      magicLinkIsSuccess: false,
      magicLinkError: {}
    });
    initializeMock = jest.fn();
    (window as any).pendo = { initialize: initializeMock };
  });

  it("doesn't initialize Pendo if the contributor is not available", () => {
    usePortalAuthContextMock.mockReturnValue({});
    tree();
    expect(loadPendoMock).not.toBeCalled();
    expect(initializeMock).not.toBeCalled();
  });

  it("doesn't initialize Pendo if the portal contribution page is loading", () => {
    usePortalMock.mockReturnValue({
      page: undefined,
      isPageError: false,
      pageError: undefined,
      isPageLoading: true,
      pageIsFetched: false,
      enablePageFetch: false,
      sendMagicLink: jest.fn(),
      magicLinkIsLoading: false,
      magicLinkIsSuccess: false,
      magicLinkError: {}
    });
    tree();
    expect(loadPendoMock).not.toBeCalled();
    expect(initializeMock).not.toBeCalled();
  });

  it('initializes Pendo once the contributor and portal contribution page are available', async () => {
    tree();
    expect(loadPendoMock).toBeCalledTimes(1);
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
  });

  it('sets the visitor to a prefixed ID, email address, and contributor role', async () => {
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        visitor: expect.objectContaining({
          id: 'mock-pendo-visitor-prefix-contributor-mock-contributor-uuid',
          email: 'mock-contributor-email',
          role: 'contributor'
        })
      })
    );
  });

  it('sets the account to a prefixed ID', async () => {
    tree();
    await waitFor(() => expect(initializeMock).toBeCalledTimes(1));
    expect(initializeMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          id: 'mock-rp-id'
        })
      })
    );
  });
});
