import Styles from 'components/content/customize/Customize';
import { GlobalLoading } from 'components/common/GlobalLoading';
import PageTitle from 'elements/PageTitle';
import useUser from 'hooks/useUser';
import { Redirect } from 'react-router-dom';
import { CONTENT_SLUG } from 'routes';
import { getUserRole } from 'utilities/getUserRole';

function CustomizeRoute() {
  const { user, isLoading } = useUser();
  const { isHubAdmin, isSuperUser } = getUserRole(user);

  if (isLoading) return <GlobalLoading />;

  if (isHubAdmin || isSuperUser) {
    return <Redirect to={CONTENT_SLUG} />;
  }

  return (
    <>
      <PageTitle title="Customize" />
      <Styles />
    </>
  );
}

export default CustomizeRoute;
