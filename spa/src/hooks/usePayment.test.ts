import * as Sentry from '@sentry/react';
import { act, renderHook } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';
import Axios from 'ajax/axios';
import { TestQueryClientProvider } from 'test-utils';
import { ContributionPage } from './useContributionPage';
import { PaymentData, usePayment } from './usePayment';
import { useCookies } from 'react-cookie';

jest.mock('@sentry/react');
jest.mock('react-cookie');

const mockFormData: PaymentData = {
  agreed_to_pay_fees: true,
  amount: '123.45',
  captcha_token: 'mock-captcha-token',
  currency: 'usd',
  donation_page_slug: 'mock-page-slug',
  donor_selected_amount: '6.78',
  email: 'mock-email',
  first_name: 'mock-first-name',
  interval: 'one_time',
  last_name: 'mock-last-name',
  mailing_city: 'mock-city',
  mailing_complement: 'mock-complement',
  mailing_country: 'mock-country',
  mailing_postal_code: 'mock-postal-code',
  mailing_state: 'mock-state',
  mailing_street: 'mock-street',
  page: 'mock-page-id',
  phone: 'mock-phone',
  revenue_program_country: 'mock-rp-country',
  revenue_program_slug: 'mock-rp-slug',
  sf_campaign_id: 'mock-campaign-id'
};

const mockPage = {
  currency: { code: 'mock-currency-code', symbol: 'mock-currency-symbol' },
  payment_provider: {
    stripe_account_id: 'mock-stripe-account-id'
  },
  revenue_program: {
    slug: 'mock-rp-slug'
  },
  slug: 'mock-page-slug',
  thank_you_redirect: 'mock-thank-you-redirect'
} as ContributionPage;

function hook() {
  return renderHook(() => usePayment(), { wrapper: TestQueryClientProvider });
}

describe('usePayment', () => {
  const axiosMock = new MockAdapter(Axios);
  const SentryMock = jest.mocked(Sentry);
  const useCookiesMock = jest.mocked(useCookies);
  let setUserMock: jest.Mock;

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.onPost('payments/').reply(200, {
      email_hash: 'mock-email-hash',
      client_secret: 'mock-client-secret',
      uuid: 'mock-payment-uuid'
    });
    axiosMock.onDelete('payments/mock-payment-uuid/').reply(204);
    setUserMock = jest.fn();
    SentryMock.setUser = setUserMock;
    useCookiesMock.mockImplementation((names?: string[]) =>
      names?.[0] === 'csrftoken' ? ([{ csrftoken: 'mock-csrf-token' }] as any) : []
    );
  });

  describe('Initially', () => {
    describe('The createPayment function it returns', () => {
      it('sets the user in Sentry based on form data', async () => {
        const { result, waitFor } = hook();

        await act(async () => {
          await result.current.createPayment!(mockFormData, mockPage);
        });
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(setUserMock.mock.calls).toEqual([
          [{ email: 'mock-email', firstName: 'mock-first-name', lastName: 'mock-last-name' }]
        ]);
      });

      it('sets the email address in Sentry to "<unset>" if it\'s not in form data', async () => {
        const { result, waitFor } = hook();

        await act(async () => {
          await result.current.createPayment!({ ...mockFormData, email: undefined } as any, mockPage);
        });
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(setUserMock.mock.calls).toEqual([
          [{ email: '<unset>', firstName: 'mock-first-name', lastName: 'mock-last-name' }]
        ]);
      });

      it('POSTs the payment data to /payments', async () => {
        const { result, waitFor } = hook();

        await act(async () => {
          await result.current.createPayment!(mockFormData, mockPage);
        });
        await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
        expect(axiosMock.history.post[0]).toEqual(
          expect.objectContaining({
            url: 'payments/',
            data: JSON.stringify(mockFormData)
          })
        );
      });

      it('handles an empty string for first name correctly', async () => {
        const { result } = hook();

        await act(async () => {
          await result.current.createPayment!({ ...mockFormData, first_name: '' } as any, mockPage);
        });
        expect(result.current.payment?.stripe.billingDetails.name).toBe(mockFormData.last_name);
      });

      it('defaults currency to USD', async () => {
        const { result } = hook();

        await act(async () => {
          await result.current.createPayment!(mockFormData, { ...mockPage, currency: undefined });
        });
        expect(result.current.payment?.currency).toEqual({ code: 'USD', symbol: '$' });
      });

      it('defaults phone number to an empty string', async () => {
        const { result } = hook();

        await act(async () => {
          await result.current.createPayment!({ ...mockFormData, phone: undefined } as any, mockPage);
        });
        expect(result.current.payment?.stripe.billingDetails.phone).toBe('');
      });

      it.each([
        ['mailing_city', 'city'],
        ['mailing_street', 'line1'],
        ['mailing_complement', 'line2'],
        ['mailing_postal_code', 'postal_code'],
        ['mailing_state', 'state']
      ])('defaults %s to an empty string', async (formKey, paymentKey) => {
        const { result } = hook();

        await act(async () => {
          await result.current.createPayment!({ ...mockFormData, [formKey]: undefined } as any, mockPage);
        });
        expect((result.current.payment?.stripe.billingDetails.address as any)[paymentKey]).toBe('');
      });

      it('sends the CSRF cookie in the POST request', async () => {
        const { result } = hook();

        await act(async () => {
          await result.current.createPayment!(mockFormData, mockPage);
        });
        expect(axiosMock.history.post[0].headers['X-CSRFTOKEN']).toBe('mock-csrf-token');
      });

      it("rejects and doesn't do a POST if the page has no slug", async () => {
        const { result } = hook();

        await expect(result.current.createPayment!(mockFormData, { ...mockPage, slug: null })).rejects.toThrow();
        expect(axiosMock.history.post.length).toBe(0);
      });

      it("rejects and doesn't do a POST if mailing country is undefined or an empty string", async () => {
        const { result } = hook();

        await expect(
          result.current.createPayment!({ ...mockFormData, mailing_country: undefined } as any, mockPage)
        ).rejects.toThrow();
        await expect(
          result.current.createPayment!({ ...mockFormData, mailing_country: '' }, mockPage)
        ).rejects.toThrow();
        expect(axiosMock.history.post.length).toBe(0);
      });

      it("rejects and doesn't do a POST if payment interval isn't set", async () => {
        const { result } = hook();

        await expect(
          result.current.createPayment!({ ...mockFormData, interval: undefined } as any, mockPage)
        ).rejects.toThrow();
        expect(axiosMock.history.post.length).toBe(0);
      });

      it("rejects and doesn't do a POST if the payment interval isn't valid", async () => {
        const { result } = hook();

        await expect(result.current.createPayment!({ ...mockFormData, interval: 'bad' }, mockPage)).rejects.toThrow();
        expect(axiosMock.history.post.length).toBe(0);
      });

      it("rejects and doesn't do a POST if the Stripe account ID isn't set", async () => {
        const { result } = hook();

        await expect(
          result.current.createPayment!(mockFormData, {
            ...mockPage,
            payment_provider: { stripe_account_id: undefined } as any
          })
        ).rejects.toThrow();
        expect(axiosMock.history.post.length).toBe(0);
      });

      it('rejects if the POST fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = hook();

        axiosMock.reset();
        axiosMock.onPost().networkError();
        await expect(result.current.createPayment!(mockFormData, mockPage)).rejects.toThrow();
        errorSpy.mockRestore();
      });
    });

    it("doesn't return a payment", async () => {
      const { result } = hook();

      expect(result.current.payment).toBeUndefined();
    });

    it("doesn't return a deletePayment function", async () => {
      const { result } = hook();

      expect(result.current.deletePayment).toBeUndefined();
    });
  });

  describe('After creating a payment', () => {
    describe('The deletePayment function it returns', () => {
      it('DELETEs to /payments', async () => {
        const { result } = hook();

        expect(result.current.deletePayment).toBeUndefined();
        await act(async () => {
          await result.current.createPayment!(mockFormData, mockPage);
        });
        expect(result.current.deletePayment).not.toBeUndefined();
        await act(async () => {
          await result.current.deletePayment!();
        });
        expect(axiosMock.history.delete.length).toBe(1);
        expect(axiosMock.history.delete[0].url).toBe('payments/mock-payment-uuid/');
      });

      it('sends the CSRF cookie in the DELETE request', async () => {
        const { result } = hook();

        await act(async () => {
          await result.current.createPayment!(mockFormData, mockPage);
        });
        await act(async () => {
          await result.current.deletePayment!();
        });
        expect(axiosMock.history.delete[0].headers['X-CSRFTOKEN']).toBe('mock-csrf-token');
      });

      it('rejects if the DELETE fails', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        axiosMock.reset();
        axiosMock.onPost().reply(200, {
          uuid: 'mock-payment-uuid'
        });
        axiosMock.onDelete('payments/mock-payment-uuid/').networkError();

        const { result } = hook();

        await act(async () => {
          await result.current.createPayment!(mockFormData, mockPage);
        });
        await expect(result.current.deletePayment!()).rejects.toThrow();
        errorSpy.mockReset();
      });
    });

    it('returns a payment object with the values passed combined with the result of the POST', async () => {
      const { result } = hook();

      await act(async () => {
        await result.current.createPayment!(mockFormData, mockPage);
      });
      expect(result.current.payment).toEqual({
        amount: mockFormData.amount,
        currency: mockPage.currency,
        emailHash: 'mock-email-hash',
        interval: mockFormData.interval,
        pageSlug: mockPage.slug,
        revenueProgramSlug: mockPage.revenue_program.slug,
        stripe: {
          accountId: mockPage.payment_provider.stripe_account_id,
          billingDetails: {
            address: {
              city: mockFormData.mailing_city,
              country: mockFormData.mailing_country,
              line1: mockFormData.mailing_street,
              line2: mockFormData.mailing_complement,
              postal_code: mockFormData.mailing_postal_code,
              state: mockFormData.mailing_state
            },
            email: mockFormData.email,
            name: `${mockFormData.first_name} ${mockFormData.last_name}`,
            phone: mockFormData.phone
          },
          clientSecret: 'mock-client-secret'
        },
        thankYouUrl: mockPage.thank_you_redirect,
        uuid: 'mock-payment-uuid'
      });
    });

    it("doesn't return a createPayment function", async () => {
      const { result } = hook();

      await act(async () => {
        await result.current.createPayment!(mockFormData, mockPage);
      });
      expect(result.current.createPayment).not.toBeDefined();
    });
  });

  describe('After deleting a payment', () => {
    it('returns a createPayment function', async () => {
      const { result } = hook();

      await act(async () => {
        await result.current.createPayment!(mockFormData, mockPage);
      });
      expect(result.current.createPayment).toBeUndefined();
      await act(async () => {
        await result.current.deletePayment!();
      });
      expect(result.current.createPayment).not.toBeUndefined();
    });

    it("doesn't return a payment", async () => {
      const { result } = hook();

      await act(async () => {
        await result.current.createPayment!(mockFormData, mockPage);
      });
      expect(result.current.payment).not.toBeUndefined();
      await act(async () => {
        await result.current.deletePayment!();
      });
      expect(result.current.payment).toBeUndefined();
    });

    it("doesn't return a deletePayment function", async () => {
      const { result } = hook();

      await act(async () => {
        await result.current.createPayment!(mockFormData, mockPage);
      });
      expect(result.current.deletePayment).not.toBeUndefined();
      await act(async () => {
        await result.current.deletePayment!();
      });
      expect(result.current.deletePayment).toBeUndefined();
    });
  });
});
