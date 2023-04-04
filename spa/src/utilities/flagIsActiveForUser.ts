import { FeatureFlag } from 'hooks/useFeatureFlags.types';

function flagIsActiveForUser(flagName: string, userFlags: FeatureFlag[]) {
  return userFlags.some(({ name }) => name === flagName);
}

export default flagIsActiveForUser;
