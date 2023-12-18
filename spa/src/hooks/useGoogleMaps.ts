import { HUB_GOOGLE_MAPS_API_KEY } from 'appSettings';
import { useEffect, useMemo, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const useGoogleMaps = (language?: string) => {
  // Another successful invocation of this hook will create a `google` global.
  // In this case, we want to avoid loading it a second time.

  const [loading, setLoading] = useState(!window.google);
  const [error, setError] = useState<Error>();
  const loader = useMemo(
    () =>
      new Loader({
        apiKey: HUB_GOOGLE_MAPS_API_KEY,
        version: 'quarterly',
        libraries: ['places'],
        language: language
      }),
    [language]
  );

  useEffect(() => {
    if (loading) {
      loader
        .importLibrary('places')
        .catch((err) => {
          console.error('Error loading Google Maps API', err);
          setError(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [loader, loading]);

  return { error, loading };
};

export default useGoogleMaps;
