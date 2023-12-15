import { Loader } from '@googlemaps/js-api-loader';
import { renderHook } from '@testing-library/react-hooks';
import useGoogleMaps from './useGoogleMaps';

jest.mock('@googlemaps/js-api-loader');

jest.mock('appSettings', () => ({
  HUB_GOOGLE_MAPS_API_KEY: 'mock-google-map-api-key'
}));

describe('useGoogleMaps hook', () => {
  const loaderMock = jest.mocked(Loader);

  it('should call the google maps loader with the correct props (api key, language, version, and library)', () => {
    expect(loaderMock).not.toHaveBeenCalled();
    renderHook(() => useGoogleMaps('mock-language'));
    expect(loaderMock).toHaveBeenCalledWith({
      apiKey: 'mock-google-map-api-key',
      version: 'quarterly',
      libraries: ['places'],
      language: 'mock-language'
    });
  });

  it('should return isGoogleMapsLoading = "true" if google maps is not loaded', async () => {
    loaderMock.mockImplementation(
      () =>
        ({
          importLibrary: () => Promise.resolve()
        }) as any
    );
    const { result, waitForNextUpdate } = renderHook(() => useGoogleMaps());
    expect(result.current.isGoogleMapsLoading).toBe(true);

    await waitForNextUpdate();
  });

  it('should return isGoogleMapsLoading = "false" if google maps finished loading', async () => {
    loaderMock.mockImplementation(
      () =>
        ({
          importLibrary: () => Promise.resolve()
        }) as any
    );
    const { result, waitFor } = renderHook(() => useGoogleMaps());
    expect(result.current.isGoogleMapsLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isGoogleMapsLoading).toBe(false);
    });
  });

  it('should return isGoogleMapsLoading = "false" if google maps load fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    loaderMock.mockImplementation(
      () =>
        ({
          importLibrary: () => Promise.reject('mock-error')
        }) as any
    );
    const { result, waitFor } = renderHook(() => useGoogleMaps());
    expect(result.current.isGoogleMapsLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isGoogleMapsLoading).toBe(false);
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading Google Maps API', 'mock-error');
  });
});
