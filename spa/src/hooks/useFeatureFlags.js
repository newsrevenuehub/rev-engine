import useUser from './useUser';

/* This hook provides any feature flags attached to the user. It
  depends on `useUser` which is responsible for retrieving the user from
  the API, and that is the source of flag data.
*/
function useFeatureFlags() {
  const { user, isLoading, isError } = useUser();
  return { flags: user?.flags || [], isLoading, isError };
}

export default useFeatureFlags;
