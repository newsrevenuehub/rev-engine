import { Redirect, useParams } from 'react-router-dom';
import urlJoin from 'url-join';
import { GlobalLoading } from 'components/common/GlobalLoading';
import { useContributionPage } from 'hooks/useContributionPage';
import { EDITOR_ROUTE } from 'routes';

interface PageEditorRedirectParams {
  pageSlug: string;
  revProgramSlug: string;
}

/**
 * Redirects a user from an /edit/rp-slug/page-slug/ route to
 * /edit/pages/page-id/. This provides backwards compatibility for how we routed
 * pages in the past, but routing directly to /edit/pages/page-id/ is preferred.
 */
export function PageEditorRedirect() {
  const { pageSlug, revProgramSlug } = useParams<PageEditorRedirectParams>();
  const { page } = useContributionPage(revProgramSlug, pageSlug);

  if (page) {
    return <Redirect to={urlJoin([EDITOR_ROUTE, 'pages', page.id.toString(), '/'])} />;
  }

  return <GlobalLoading />;
}
