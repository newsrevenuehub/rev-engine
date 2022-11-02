import { FeatureFlag } from './useFeatureFlags.types';

import useUser from './useUser';

interface UseFeatureFlagsHook {
  flags: FeatureFlag[];
  isLoading: boolean;
  isError: boolean;
};

/* This hook provides any feature flags attached to the user. It
  depends on `useUser` which is responsible for retrieving the user from
  the API, and that is the source of flag data.
*/
function useFeatureFlags(): UseFeatureFlagsHook {
  const { user, isLoading, isError } = useUser();
  return { flags: user?.flags || [], isLoading, isError };
}

export default useFeatureFlags;
