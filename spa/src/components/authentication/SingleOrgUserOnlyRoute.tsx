import { Redirect } from 'react-router-dom';
import PropTypes, { InferProps } from 'prop-types';

import useUser from 'hooks/useUser';
import { CONTENT_SLUG } from 'routes';
import { GlobalLoading } from 'components/common/GlobalLoading';

export type SingleOrgUserOnlyRouteProps = InferProps<typeof SingleOrgUserOnlyRoutePropTypes>;

const SingleOrgUserOnlyRoute = ({ children }: SingleOrgUserOnlyRouteProps) => {
  const { user, isLoading } = useUser();
  const userHasSingleOrg = user?.organizations?.length === 1;

  if (isLoading) return <GlobalLoading />;

  if (!isLoading && !userHasSingleOrg) {
    return <Redirect to={CONTENT_SLUG} />;
  }

  return <>{children}</>;
};

const SingleOrgUserOnlyRoutePropTypes = {
  children: PropTypes.node.isRequired
};

SingleOrgUserOnlyRoute.propTypes = SingleOrgUserOnlyRoutePropTypes;

export default SingleOrgUserOnlyRoute;
