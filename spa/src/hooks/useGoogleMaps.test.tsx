import { Loader } from '@googlemaps/js-api-loader';
import { renderHook } from '@testing-library/react-hooks';
import useGoogleMaps from './useGoogleMaps';

jest.mock('@googlemaps/js-api-loader');

jest.mock('appSettings', () => ({
  HUB_GOOGLE_MAPS_API_KEY: 'mock-google-map-api-key'
}));

describe('useGoogleMaps hook', () => {
  const loaderMock = jest.mocked(Loader);

  describe('If the Google Maps API already exists in global scope', () => {
    beforeEach(() => {
      (window as any).google = {};
    });

    afterEach(() => {
      delete (window as any).google;
    });

    it("doesn't load the Google Maps API", () => {
      const importLibrary = jest.fn();

      loaderMock.mockImplementation(() => ({ importLibrary }) as any);
      renderHook(() => useGoogleMaps('mock-language'));
      expect(importLibrary).not.toHaveBeenCalled();
    });

    it('returns a loaded state', () => {
      const { result } = renderHook(() => useGoogleMaps('mock-language'));

      expect(result.current.error).toBeUndefined();
      expect(result.current.loading).toBe(false);
    });
  });

  describe("If the Google Maps API doesn't already exist in global scope", () => {
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

    it('should return loading = "true" if google maps is not loaded', async () => {
      loaderMock.mockImplementation(
        () =>
          ({
            importLibrary: () => Promise.resolve()
          }) as any
      );
      const { result, waitForNextUpdate } = renderHook(() => useGoogleMaps());
      expect(result.current.loading).toBe(true);

      await waitForNextUpdate();
    });

    it('should return loading = "false" if google maps finished loading', async () => {
      loaderMock.mockImplementation(
        () =>
          ({
            importLibrary: () => Promise.resolve()
          }) as any
      );
      const { result, waitFor } = renderHook(() => useGoogleMaps());
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should return loading = "false" and the error if google maps load fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      loaderMock.mockImplementation(
        () =>
          ({
            importLibrary: () => Promise.reject('mock-error')
          }) as any
      );
      const { result, waitFor } = renderHook(() => useGoogleMaps());
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.error).toBe('mock-error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading Google Maps API', 'mock-error');
    });
  });
});
