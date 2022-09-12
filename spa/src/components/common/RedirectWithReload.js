import { useHistory, withRouter } from 'react-router-dom';

const RedirectWithReload = (props) => {
  let history = useHistory();
  history.push({ pathname: props.to, search: props.location.search });
  window.location.reload();
  return <></>;
};
export default withRouter(RedirectWithReload);
