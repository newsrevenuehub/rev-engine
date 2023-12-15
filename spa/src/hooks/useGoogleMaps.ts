import { HUB_GOOGLE_MAPS_API_KEY } from 'appSettings';
import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const useGoogleMaps = (language?: string) => {
  const [loading, setLoading] = useState(true);
  const loader = new Loader({
    apiKey: HUB_GOOGLE_MAPS_API_KEY,
    version: 'quarterly',
    libraries: ['places'],
    language: language
  });

  useEffect(() => {
    loader
      .importLibrary('places')
      .then(() => {
        console.log('Google Maps API is loaded and available');
      })
      .catch((err) => {
        console.error('Error loading Google Maps API', err);
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only load once

  return { isGoogleMapsLoading: loading };
};

export default useGoogleMaps;
