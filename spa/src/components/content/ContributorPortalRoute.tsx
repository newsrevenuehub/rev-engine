import { GlobalLoading } from 'components/common/GlobalLoading';
import PageTitle from 'elements/PageTitle';
import useUser from 'hooks/useUser';
import { Redirect } from 'react-router-dom';
import { CONTENT_SLUG } from 'routes';
import { getUserRole } from 'utilities/getUserRole';
import ContributorPortal from './contributor-portal/ContributorPortal';

function ContributorPortalRoute() {
  const { user, isLoading } = useUser();
  const { isHubAdmin, isSuperUser } = getUserRole(user);

  if (isLoading) return <GlobalLoading />;

  if (isHubAdmin || isSuperUser) {
    return <Redirect to={CONTENT_SLUG} />;
  }

  return (
    <>
      <PageTitle title="Contributor Portal" />
      <ContributorPortal revenueProgram={user?.revenue_programs?.[0]} />
    </>
  );
}

export default ContributorPortalRoute;
