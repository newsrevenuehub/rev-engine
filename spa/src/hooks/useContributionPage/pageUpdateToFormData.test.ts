import html2canvas from 'html2canvas';
import { formDataToObject } from 'test-utils';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';
import { pageUpdateToFormData, putImagesInFormData } from './pageUpdateToFormData';
import { ContributionPageElement } from './useContributionPage.types';

jest.mock('html2canvas');

const mockFile = new File(['mock-contents'], 'mock-file.jpeg');
const mockDAmount: ContributionPageElement = {
  type: 'DAmount',
  uuid: 'mock-amount-uuid',
  content: {},
  requiredFields: []
};
const mockDImage: ContributionPageElement = {
  type: 'DImage',
  uuid: 'mock-image-uuid',
  content: mockFile,
  requiredFields: []
};

describe('putImagesInFormData', () => {
  let formData: FormData;

  beforeEach(() => (formData = new FormData()));

  it("puts files in the form data object passed, keyed on the element's UUID", () => {
    putImagesInFormData([mockDAmount, mockDImage], formData);
    expect(formDataToObject(formData)).toEqual({
      'mock-image-uuid': mockFile
    });
  });

  it("doesn't modify the elements passed", () => {
    const before = [{ ...mockDAmount }, { ...mockDImage }];

    putImagesInFormData([mockDAmount, mockDImage], formData);
    expect([mockDAmount, mockDImage]).toEqual(before);
  });

  it('ignores DImage elements whose contents are strings', () => {
    putImagesInFormData([mockDAmount, { ...mockDImage, content: 'previously-uploaded-file.jpeg' }], formData);
    expect(formDataToObject(formData)).toEqual({});
  });

  it('ignores elements that are not DImages, even if their content is a file', () => {
    putImagesInFormData([{ ...mockDAmount, content: mockFile }], formData);
    expect(formDataToObject(formData)).toEqual({});
  });

  it('does nothing if there are no DImage elements', () => {
    putImagesInFormData([mockDAmount], formData);
    expect(formDataToObject(formData)).toEqual({});
  });
});

describe('pageUpdateToFormData', () => {
  const html2canvasMock = html2canvas as jest.Mock;

  beforeEach(() => {
    html2canvasMock.mockImplementation(() => ({
      toBlob(callback: (blob: Blob) => void) {
        callback(new Blob(['mock-screenshot-contents']));
      }
    }));
  });

  it('sets fields in the form data', async () => {
    const result = await pageUpdateToFormData({
      allow_offer_nyt_comp: true,
      name: 'test-name'
    });

    // Form data always sends strings as values.

    expect(formDataToObject(result)).toEqual({
      allow_offer_nyt_comp: 'true',
      name: 'test-name'
    });
  });

  it('strips image thumbnail fields', async () => {
    const result = await pageUpdateToFormData({
      graphic_thumbnail: 'bad',
      header_bg_image_thumbnail: 'bad',
      header_logo_thumbnail: 'bad'
    });

    expect(formDataToObject(result)).toEqual({});
  });

  it('strips image fields that have string values', async () => {
    const result = await pageUpdateToFormData({
      graphic: 'bad',
      header_bg_image: 'bad',
      header_logo: 'bad'
    });

    expect(formDataToObject(result)).toEqual({});
  });

  it('retains image fields that have file values', async () => {
    const changes = {
      graphic: mockFile,
      header_bg_image: mockFile,
      header_logo: mockFile
    };
    const result = await pageUpdateToFormData(changes);

    expect(formDataToObject(result)).toEqual(changes);
  });

  it('coerces undefined image field values to empty strings', async () => {
    const changes = {
      graphic: undefined,
      header_bg_image: undefined,
      header_logo: undefined
    };
    const result = await pageUpdateToFormData(changes);

    expect(formDataToObject(result)).toEqual({
      graphic: '',
      header_bg_image: '',
      header_logo: ''
    });
  });

  it('converts date fields to string timestamps', async () => {
    // This functionality may not be needed--as we adopt TypeScript more, we can
    // force fields to be strings. For now we cast the object as any to reflect
    // it's malformed.

    const now = new Date();
    const result = await pageUpdateToFormData({ published_date: now } as any);

    expect(formDataToObject(result)).toEqual({ published_date: formatDatetimeForAPI(now) });
  });

  it('serializes the elements field to JSON', async () => {
    const elements = [mockDAmount, mockDAmount];
    const result = await pageUpdateToFormData({ elements });

    expect(formDataToObject(result)).toEqual({ elements: JSON.stringify(elements) });
  });

  it('adds images in the elements field as separate keys', async () => {
    const elements = [mockDAmount, mockDImage];
    const result = await pageUpdateToFormData({ elements });

    expect(formDataToObject(result)).toEqual({ elements: JSON.stringify(elements), [mockDImage.uuid]: mockFile });
  });

  it('serializes the sidebar elements field to JSON', async () => {
    const sidebar_elements = [mockDAmount, mockDAmount];
    const result = await pageUpdateToFormData({ sidebar_elements });

    expect(formDataToObject(result)).toEqual({ sidebar_elements: JSON.stringify(sidebar_elements) });
  });

  it('adds images in the sidebar elements field as separate keys', async () => {
    const sidebar_elements = [mockDAmount, mockDImage];
    const result = await pageUpdateToFormData({ sidebar_elements });

    expect(formDataToObject(result)).toEqual({
      sidebar_elements: JSON.stringify(sidebar_elements),
      [mockDImage.uuid]: mockFile
    });
  });

  it('sets the style property to just the ID', async () => {
    const result = await pageUpdateToFormData({
      styles: {
        colors: {},
        created: 'test-created',
        font: {},
        id: 123,
        modified: 'test-modified',
        name: 'test-name',
        styles: {},
        used_live: false
      }
    });

    expect(formDataToObject(result)).toEqual({ styles: '123' });
  });

  it('coerces undefined publish_date properties to an empty string', async () => {
    const result = await pageUpdateToFormData({
      published_date: undefined
    });

    expect(formDataToObject(result)).toEqual({ published_date: '' });
  });

  it('adds a screenshot of an HTML element as the page_screenshot field if passed both the element and a base filename', async () => {
    const result = formDataToObject(await pageUpdateToFormData({}, 'test-name', document.body));

    expect(html2canvasMock.mock.calls).toEqual([[document.body]]);
    expect(result.page_screenshot).toBeInstanceOf(File);

    // The filename is timestamped, so just check for formatting and not a precise value.

    expect(result.page_screenshot.name).toMatch(/^test-name_\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}[-+]\d\d.png$/);
  });

  it('throws an error if a screenshot is requested, but no name is provided', () =>
    expect(() => pageUpdateToFormData({}, undefined, document.body)).rejects.toEqual(expect.any(Error)));

  it('throws an error if creating a screenshot fails', async () => {
    html2canvasMock.mockImplementation(() => ({
      toBlob(callback: (blob: Blob | null) => void) {
        // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#parameters
        callback(null);
      }
    }));
    await expect(() => pageUpdateToFormData({}, 'test-name', document.body)).rejects.toEqual(expect.any(Error));
  });
});
