import { isBefore, isValid, parseISO } from 'date-fns';
import { ContributionPage } from 'hooks/useContributionPage';

/**
 * Returns whether a page is published as of a certain date--by default, right now.
 */
export function pageIsPublished(page: Partial<ContributionPage>, now = new Date()) {
  if (!page.published_date) {
    return false;
  }

  // Try using JS's built in parser, then fall back to ISO date format. This is
  // because JS can't parse values that formatDateTimeForAPI() returns.

  let date = new Date(page.published_date);

  if (!isValid(date)) {
    date = parseISO(page.published_date);

    if (!isValid(date)) {
      throw new Error(`Page's published_date is not a valid date: "${page.published_date}"`);
    }
  }

  return isBefore(date, now);
}

export function getUpdateSuccessMessage(oldPage: ContributionPage, changes: Partial<ContributionPage>) {
  const wasPublished = pageIsPublished(oldPage);

  // If the publish date isn't being changed, use the base page's publish date.
  // We have to be careful about this check because published_date might be set
  // to undefined.

  const isNowPublished = 'published_date' in changes ? pageIsPublished(changes) : wasPublished;

  if (isNowPublished) {
    if (!wasPublished) {
      return 'Your page has been updated and is now LIVE';
    }

    return 'Your LIVE page has been updated';
  }

  if (wasPublished && !isNowPublished) {
    return 'Your page has been updated and is no longer live';
  }

  return 'Your page has been updated';
}
