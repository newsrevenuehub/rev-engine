import { ContributionPage } from 'hooks/useContributionPage';
import { Organization } from 'hooks/useUser.types';

/**
 * Returns whether an Organization can have a new page published (limit hasn't been reached).
 * If pages are being fetched, this returns `false`.
 */
const orgHasPublishPageLimit = (org: Organization, pages?: ContributionPage[]) => {
  // If we don't know how many pages exist, assume no.
  if (!pages) {
    return false;
  }

  // Filter pages by the organization and then filter by published date.
  // Compare the currently published pages with the organization's plan limit
  // We don't consider dates here; e.g. if a page has a publish date a year away,
  // it still counts as published.
  return (
    pages.filter(
      (page) =>
        // Filter pages by organization
        // Page list serializer only returns the organization id, not the full object (reduce payload size)
        (page.revenue_program.organization as any) === org?.id &&
        // Filter pages that have been published
        !!page.published_date
    ).length < org.plan.publish_limit
  );
};

export { orgHasPublishPageLimit };
