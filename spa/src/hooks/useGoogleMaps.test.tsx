import { act, cleanup, renderHook } from '@testing-library/react-hooks';
import useGoogleMaps, { scriptSrc } from './useGoogleMaps';
import { screen } from 'test-utils';

jest.mock('appSettings', () => ({
  HUB_GOOGLE_MAPS_API_KEY: 'mock-google-map-api-key'
}));

describe('useGoogleMaps hook', () => {
  afterAll(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('should add the google maps script to the document', () => {
    renderHook(() => useGoogleMaps());
    expect(screen.getByTestId('google-maps-script-tag')).toBeInTheDocument();
  });

  it.each([
    ['api key', 'key=mock-google-map-api-key'],
    ['places libraries', 'libraries=places'],
    ['callback function', 'callback=initMap']
  ])('should add to the script the %s', (_, queryParam) => {
    renderHook(() => useGoogleMaps());
    const script = screen.getByTestId('google-maps-script-tag');
    expect(script).toHaveAttribute('src', scriptSrc);
    expect(script.getAttribute('src')).toContain(queryParam);
  });

  it('should add language as query param to the script', () => {
    renderHook(() => useGoogleMaps('mock-language'));
    const script = screen.getByTestId('google-maps-script-tag');
    expect(script.getAttribute('src')).toContain('language=mock-language');
  });

  it('should not add language as query param to the script if language is not provided', () => {
    renderHook(() => useGoogleMaps());
    const script = screen.getByTestId('google-maps-script-tag');
    expect(script.getAttribute('src')).not.toContain('language=');
  });

  it('should return isGoogleMapsLoading = "false" if google maps is not loaded', () => {
    const { result } = renderHook(() => useGoogleMaps());
    expect(result.current.isGoogleMapsLoading).toBe(true);
  });

  it.each([
    ['is loaded', 'load'],
    ['fails to load', 'error']
  ])('should return isGoogleMapsLoading = "true" if google maps %s', (_, event) => {
    const { result } = renderHook(() => useGoogleMaps());
    const script = screen.getByTestId('google-maps-script-tag');
    expect(result.current.isGoogleMapsLoading).toBe(true);
    act(() => {
      script.dispatchEvent(new Event(event));
    });
    expect(result.current.isGoogleMapsLoading).toBe(false);
  });
});
