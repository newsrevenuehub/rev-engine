import {
  USER_ROLE_HUB_ADMIN_TYPE,
  USER_ROLE_ORG_ADMIN_TYPE,
  USER_ROLE_RP_ADMIN_TYPE,
  USER_SUPERUSER_TYPE
} from 'constants/authConstants';
import { User } from 'hooks/useUser.types';
import { getUserRole } from './userRoleType';

const userWithRoles: any = {
  role_type: [USER_ROLE_HUB_ADMIN_TYPE, USER_ROLE_ORG_ADMIN_TYPE, USER_ROLE_RP_ADMIN_TYPE, USER_SUPERUSER_TYPE]
};

describe('userRoleType', () => {
  it.each([
    ['return true for roles in user.role_type', true, userWithRoles],
    ['return false for roles not in user.role_type', false, { role_type: [] }],
    ['returns all false if user is undefined', false, undefined]
  ])('%s', (_, result, user) =>
    expect(getUserRole(user)).toEqual({
      isHubAdmin: result,
      isOrgAdmin: result,
      isRPAdmin: result,
      isSuperUser: result
    })
  );

  it.each([
    ['isHubAdmin', USER_ROLE_HUB_ADMIN_TYPE, { role_type: [USER_ROLE_HUB_ADMIN_TYPE] } as any as User],
    ['isOrgAdmin', USER_ROLE_ORG_ADMIN_TYPE, { role_type: [USER_ROLE_ORG_ADMIN_TYPE] } as any as User],
    ['isRPAdmin', USER_ROLE_RP_ADMIN_TYPE, { role_type: [USER_ROLE_RP_ADMIN_TYPE] } as any as User],
    ['isSuperUser', USER_SUPERUSER_TYPE, { role_type: [USER_SUPERUSER_TYPE] } as any as User]
  ])('return only %s = true if user.role_type includes %s', (key, _, user) =>
    expect(getUserRole(user)).toEqual({
      isHubAdmin: false,
      isOrgAdmin: false,
      isRPAdmin: false,
      isSuperUser: false,
      [key]: true
    })
  );
});
