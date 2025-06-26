import { renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import { EmailCustomization, useEmailCustomizations } from './useEmailCustomizations';
import { EMAIL_CUSTOMIZATIONS, getEmailCustomizationEndpoint } from 'ajax/endpoints';

const mockCustomization: EmailCustomization = {
  content_html: 'test-content-html',
  content_plain_text: 'test-content-plain-text',
  id: 1,
  revenue_program: 987,
  email_type: 'contribution_receipt',
  email_block: 'message'
};

function hook(emailType: EmailCustomization['email_type'] = 'contribution_receipt') {
  return renderHook(() => useEmailCustomizations(emailType), {
    wrapper: TestQueryClientProvider
  });
}

describe('useEmailCustomizations', () => {
  const axiosMock = new MockAdapter(Axios);

  beforeEach(() => {
    axiosMock.onGet(EMAIL_CUSTOMIZATIONS).reply(200, [mockCustomization]);
    axiosMock.onPost(EMAIL_CUSTOMIZATIONS).reply(204);
    axiosMock.onPatch(getEmailCustomizationEndpoint(1)).reply(204);
  });
  afterEach(() => axiosMock.reset());
  afterAll(() => axiosMock.restore());

  describe('While fetching customizations', () => {
    it('returns a loading status', async () => {
      const { result, waitForNextUpdate } = hook();

      expect(result.current.isLoading).toBe(true);
      await waitForNextUpdate();
    });

    it('returns undefined data', async () => {
      const { result, waitForNextUpdate } = hook();

      expect(result.current.customizations).toBeUndefined();
      await waitForNextUpdate();
    });

    it("doesn't return an upsertCustomizations function", async () => {
      const { result, waitForNextUpdate } = hook();

      expect(result.current.upsertCustomizations).toBeUndefined();
      await waitForNextUpdate();
    });
  });

  it('returns customizations for the requested email type once data is retrieved', async () => {
    const { result, waitForValueToChange } = hook();

    await waitForValueToChange(() => result.current.customizations);
    expect(result.current.customizations).toEqual({ [mockCustomization.email_block]: mockCustomization });
  });

  it('returns an empty object if there are no customizations for the requested email type', async () => {
    const { result, waitForValueToChange } = hook('nonexistent' as any);

    await waitForValueToChange(() => result.current.customizations);
    expect(result.current.customizations).toEqual({});
  });

  describe('upsertCustomizations', () => {
    it('POSTs to create customizations when none already exist', async () => {
      axiosMock.onGet(EMAIL_CUSTOMIZATIONS).reply(200, []);

      const { result, waitForNextUpdate } = hook('contribution_receipt');

      expect(result.current.upsertCustomizations).toBeUndefined();
      await waitForNextUpdate();
      await result.current.upsertCustomizations!({ message: 'test-change' }, 123);
      expect(axiosMock.history.patch.length).toBe(0);
      expect(axiosMock.history.post.length).toBe(1);
      expect(axiosMock.history.post[0]).toEqual(
        expect.objectContaining({
          data: JSON.stringify({
            content_html: 'test-change',
            email_block: 'message',
            email_type: 'contribution_receipt',
            revenue_program: 123
          }),
          url: EMAIL_CUSTOMIZATIONS
        })
      );
    });

    it('PATCHes to update customizations when one already exists', async () => {
      const { result, waitForNextUpdate } = hook('contribution_receipt');

      expect(result.current.upsertCustomizations).toBeUndefined();
      await waitForNextUpdate();
      await result.current.upsertCustomizations!({ message: 'test-change' }, 123);
      expect(axiosMock.history.post.length).toBe(0);
      expect(axiosMock.history.patch.length).toBe(1);
      expect(axiosMock.history.patch[0]).toEqual(
        expect.objectContaining({
          data: JSON.stringify({
            content_html: 'test-change',
            email_block: 'message',
            email_type: 'contribution_receipt',
            id: mockCustomization.id,
            revenue_program: mockCustomization.revenue_program
          }),
          url: getEmailCustomizationEndpoint(1)
        })
      );
    });

    it('resolves to true if all requests succeed', async () => {
      const { result, waitForNextUpdate } = hook();

      expect(result.current.upsertCustomizations).toBeUndefined();
      await waitForNextUpdate();
      expect(await result.current.upsertCustomizations!({ message: 'test-change' }, 123)).toBe(true);
    });

    it('resolves to false if any request fails', async () => {
      axiosMock.reset();
      axiosMock.onGet(EMAIL_CUSTOMIZATIONS).reply(200, [mockCustomization]);
      axiosMock.onPatch().networkError();

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result, waitForNextUpdate } = hook();

      expect(result.current.upsertCustomizations).toBeUndefined();
      await waitForNextUpdate();
      expect(await result.current.upsertCustomizations!({ message: 'test-change' }, 123)).toBe(false);
      errorSpy.mockRestore();
    });
  });
});
