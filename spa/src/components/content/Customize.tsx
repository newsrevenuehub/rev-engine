import Styles from 'components/content/styles/Styles';
import GlobalLoading from 'elements/GlobalLoading';
import PageTitle from 'elements/PageTitle';
import useUser from 'hooks/useUser';
import { Redirect } from 'react-router-dom';
import { CONTENT_SLUG } from 'routes';
import { getUserRole } from 'utilities/getUserRole';

function Customize() {
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

export default Customize;
