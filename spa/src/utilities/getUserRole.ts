import {
  USER_ROLE_HUB_ADMIN_TYPE,
  USER_ROLE_ORG_ADMIN_TYPE,
  USER_ROLE_RP_ADMIN_TYPE,
  USER_SUPERUSER_TYPE
} from 'constants/authConstants';
import { User } from 'hooks/useUser.types';

export const getUserRole = (user?: User) => {
  const isSuperUser = user?.role_type?.includes(USER_SUPERUSER_TYPE) ?? false;
  const isHubAdmin = user?.role_type?.includes(USER_ROLE_HUB_ADMIN_TYPE) ?? false;
  const isOrgAdmin = user?.role_type?.includes(USER_ROLE_ORG_ADMIN_TYPE) ?? false;
  const isRPAdmin = user?.role_type?.includes(USER_ROLE_RP_ADMIN_TYPE) ?? false;

  return { isHubAdmin, isOrgAdmin, isRPAdmin, isSuperUser };
};
