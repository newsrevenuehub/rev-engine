import { isBefore, isAfter } from 'date-fns';

function newPageIsCurrentlyPublished(newPage, now = new Date()) {
  isBefore(new Date(newPage.published_date), now);
}

function newPageIsNotCurrentlyPublished(newPage, now = new Date()) {
  isAfter(new Date(newPage.published_date), now);
}

export function pageHasBeenPublished(page, now = new Date()) {
  return page?.published_date && isBefore(new Date(page.published_date), now);
}

function pageHasNotBeenPublished(page, now = new Date()) {
  return !page?.published_date || isAfter(new Date(page.published_date), now);
}

function getSuccessMessage(page, newPage) {
  const now = new Date();
  const isNowPublished = newPageIsCurrentlyPublished(newPage, now);
  const isNowNotPublished = newPageIsNotCurrentlyPublished(newPage, now);
  const wasPublished = pageHasBeenPublished(page, now);
  const wasNotPublished = pageHasNotBeenPublished(page, now);

  if (isNowPublished) {
    if (wasNotPublished) {
      return 'Your page has been updated and is now LIVE';
    }
    return 'Your LIVE page has been updated';
  }

  if (wasPublished && isNowNotPublished) {
    return 'Your page has been updated and is no longer live';
  }
  return 'Your page has been updated';
}

export default getSuccessMessage;
