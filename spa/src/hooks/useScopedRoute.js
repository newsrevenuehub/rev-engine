import { useHistory, generatePath, matchPath } from 'react-router-dom';

function useScopedRoute(baseSlug, patterns = []) {
  const history = useHistory();
  const { params } = matchPath(history.location.pathname, { path: patterns.map((r) => r.path) }) || {};
  if (!params) return '';
  return generatePath(baseSlug, params);
}

export default useScopedRoute;
