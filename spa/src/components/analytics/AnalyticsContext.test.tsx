import { useEffect } from 'react';
import { AnalyticsContextProvider, useAnalyticsContext } from './AnalyticsContext';
import { useConfigureAnalytics } from '.';
import { render } from 'test-utils';
import Analytics from 'analytics';
import fbPixel, { FB_PIXEL_PLUGIN_NAME } from './plugins/facebookPixel';
const FB_PIXEL_ID = '123456789';
const DONATION_AMOUNT = 22.0;

jest.mock('analytics');
jest.mock('./plugins/facebookPixel');

const TestComponent = () => {
  const { trackConversion, analyticsInstance } = useAnalyticsContext();
  useConfigureAnalytics({ orgFbPixelId: FB_PIXEL_ID } as any);
  useEffect(() => {
    if (analyticsInstance) {
      trackConversion(DONATION_AMOUNT);
    }
  }, [analyticsInstance, trackConversion]);
  return null;
};

function tree() {
  return render(
    <AnalyticsContextProvider>
      <TestComponent />
    </AnalyticsContextProvider>
  );
}

describe('trackConversion', () => {
  const AnalyticsMock = jest.mocked(Analytics);
  const fbPixelMock = jest.mocked(fbPixel);

  it('sends a donation and purchase event to Facebook Pixel when org has FB pixel id', async () => {
    const trackConversion = jest.fn();

    AnalyticsMock.mockReturnValue({ plugins: { [FB_PIXEL_PLUGIN_NAME]: { trackConversion } } } as any);
    tree();
    expect(fbPixelMock).toBeCalledWith(FB_PIXEL_ID);
    expect(trackConversion.mock.calls).toEqual([[DONATION_AMOUNT]]);
  });
});
