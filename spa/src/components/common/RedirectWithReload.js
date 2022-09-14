import { PropTypes } from 'prop-types';
import { withRouter } from 'react-router-dom';

const RedirectWithReload = ({ history, to, location }) => {
  history.replace({ pathname: to, search: location.search });
  window.location.reload();
  return null;
};

RedirectWithReload.propTypes = {
  to: PropTypes.string.isRequired,
  location: PropTypes.any,
  history: PropTypes.any
};

export default withRouter(RedirectWithReload);
