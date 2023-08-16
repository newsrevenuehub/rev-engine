import { User } from 'hooks/useUser.types';

function flagIsActiveForUser(flagName: string, user: User) {
  return user.flags.some(({ name }) => name === flagName);
}

export default flagIsActiveForUser;
