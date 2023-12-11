import { HUB_GOOGLE_MAPS_API_KEY } from 'appSettings';
import { useEffect, useState } from 'react';

export const scriptSrc = `https://maps.googleapis.com/maps/api/js?key=${HUB_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;

const useGoogleMaps = (language?: string) => {
  const [loading, setLoading] = useState(true);
  const languageQueryParam = language ? `&language=${language}` : '';

  useEffect(() => {
    // Create the script tag, set the appropriate attributes
    const script = document.createElement('script');
    script.src = `${scriptSrc}${languageQueryParam}`;
    script.setAttribute('data-testid', 'google-maps-script-tag');

    // Attach your callback function to the `window` object
    (window as any).initMap = async function () {
      console.log('Google Maps API is loaded and available');

      if (typeof google !== 'undefined') {
        setLoading(false);
      }
    };

    script.onload = () => {
      setLoading(false);
    };

    script.onerror = () => {
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [languageQueryParam]);

  return { isGoogleMapsLoading: loading };
};

export default useGoogleMaps;
