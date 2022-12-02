import html2canvas from 'html2canvas';
import { Style } from 'hooks/useStyleList';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';
import { ContributionPage, ContributionPageElement } from './useContributionPage.types';

const ELEMENT_FIELDS = ['elements', 'sidebar_elements'];
const IMAGE_FIELDS = ['graphic', 'header_bg_image', 'header_logo'];
const THUMBNAIL_FIELDS = ['graphic_thumbnail', 'header_bg_image_thumbnail', 'header_logo_thumbnail'];

/**
 * Takes image blobs that have been set in elements and moves them into form
 * data. It doesn't modify the elements.
 */
export function putImagesInFormData(elements: ContributionPageElement[], formData: FormData) {
  for (const element of elements) {
    if (element.type === 'DImage' && element.content instanceof File) {
      formData.append(element.uuid, element.content, element.content.name);
    }
  }
}

/**
 * Converts a page object into form data to be submitted to the API for an update.
 */
export async function pageUpdateToFormData(
  pageUpdates: Partial<ContributionPage>,
  screenshotBaseName?: string,
  elementToScreenshot?: HTMLElement
) {
  const formData = new FormData();
  const normalizedFields = Object.keys(pageUpdates).reduce((result, pageKey) => {
    const key = pageKey as keyof ContributionPage;

    // Ignore inherited properties and thumbnail image fields. Thumbnails are
    // always generated by the API.

    if (!pageUpdates.hasOwnProperty(key) || THUMBNAIL_FIELDS.includes(key)) {
      return result;
    }

    // Ignore image fields that contain strings. These must have been given to
    // us by the API after saving a page, and are URLs to uploaded files.

    if (IMAGE_FIELDS.includes(key) && typeof pageUpdates[key] === 'string') {
      return result;
    }

    let value = pageUpdates[key];

    // Convert dates to timestamps.

    if (value instanceof Date) {
      return { ...result, [key]: formatDatetimeForAPI(value, true) };
    }

    // Convert page element arrays to JSON. *Side effect:* add image files to
    // the result form data directly.

    if (ELEMENT_FIELDS.includes(key)) {
      putImagesInFormData(value as ContributionPageElement[], formData);
      return { ...result, [key]: JSON.stringify(value) };
    }

    // Remove everything in the styles property except the ID.

    if (key === 'styles') {
      return { ...result, [key]: (value as Style).id.toString() };
    }

    // Coerce undefined publish dates to empty strings.

    if (key === 'published_date' && value === undefined) {
      return { ...result, [key]: '' };
    }

    // Fall through to leaving the field as is.

    return { ...result, [key]: value };
  }, {});

  for (const [key, value] of Object.entries(normalizedFields)) {
    formData.append(key, value as string);
  }

  if (elementToScreenshot) {
    if (!screenshotBaseName) {
      throw new Error('Asked to add a screenshot, but no base file name was provided');
    }

    const canvas = await html2canvas(elementToScreenshot);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));

    if (!blob) {
      throw new Error('Could not convert canvas to blob');
    }

    formData.append('page_screenshot', blob, `${screenshotBaseName}_${formatDatetimeForAPI(new Date())}.png`);
  }

  return formData;
}
