import { add, formatISO } from 'date-fns';
import { getUpdateSuccessMessage, pageIsPublished } from './editPageGetSuccessMessage';
import formatDatetimeForAPI from './formatDatetimeForAPI';

const now = new Date();
const oneMinuteEarlier = add(now, { minutes: -1 });
const oneMinuteLater = add(now, { minutes: 1 });
const tomorrow = add(now, { days: 1 });
const yesterday = add(now, { days: -1 });

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(now);
});

afterAll(() => jest.useRealTimers());

describe('pageIsPublished', () => {
  describe('When a date to compare is not passed', () => {
    it('returns false if the page has no published_date', () => expect(pageIsPublished({})).toBe(false));

    it('returns false if the page has a published_date after the current date/time', () =>
      expect(pageIsPublished({ published_date: formatISO(oneMinuteLater) })).toBe(false));

    it('returns true if the page has a published_date before the current date/time', () =>
      expect(pageIsPublished({ published_date: formatISO(oneMinuteEarlier) })).toBe(true));
  });

  describe('When a date to compare is passed', () => {
    it('returns false if the page has no published_date', () => expect(pageIsPublished({}, tomorrow)).toBe(false));

    it('returns false if the page has a published_date after the current date/time', () =>
      expect(pageIsPublished({ published_date: formatISO(now) }, oneMinuteEarlier)).toBe(false));

    it('returns true if the page has a published_date before the current date/time', () =>
      expect(pageIsPublished({ published_date: formatISO(yesterday) }, oneMinuteEarlier)).toBe(true));
  });

  it('handles published_dates that came from formatDateTimeForAPI()', () => {
    expect(pageIsPublished({ published_date: formatDatetimeForAPI(now) }, oneMinuteEarlier)).toBe(false);
    expect(pageIsPublished({ published_date: formatDatetimeForAPI(yesterday) }, oneMinuteEarlier)).toBe(true);
  });

  it("throws an error if the page's published_date is not a valid date", () =>
    expect(() => pageIsPublished({ published_date: 'bad' })).toThrow());
});

describe('getUpdateSuccessMessage', () => {
  describe("When the page's publish_date isn't changing", () => {
    it('says the page is live if it is published', () =>
      expect(getUpdateSuccessMessage({ published_date: formatISO(yesterday) } as any, {})).toBe(
        'Your LIVE page has been updated'
      ));

    it("says the page isn't live if it isn't published", () => {
      expect(getUpdateSuccessMessage({} as any, {})).toBe('Your page has been updated');
      expect(getUpdateSuccessMessage({ published_date: formatISO(tomorrow) } as any, {})).toBe(
        'Your page has been updated'
      );
    });
  });

  describe("When the page's publish_date is changing", () => {
    it('says the page is live if it is gaining a publish_date in the past', () => {
      expect(getUpdateSuccessMessage({} as any, { published_date: formatISO(yesterday) })).toBe(
        'Your page has been updated and is now LIVE'
      );
    });

    it('says the page is no longer live if the page was published, but is now published in the future', () => {
      expect(
        getUpdateSuccessMessage({ published_date: formatISO(yesterday) } as any, {
          published_date: formatISO(tomorrow)
        })
      ).toBe('Your page has been updated and is no longer live');
    });

    it('says the page is no longer live if the page was published, but is now unpublished', () => {
      expect(
        getUpdateSuccessMessage({ published_date: formatISO(yesterday) } as any, {
          published_date: undefined
        })
      ).toBe('Your page has been updated and is no longer live');
    });

    it('says the page is updated if the page was queued to be published, and is still queued', () => {
      expect(
        getUpdateSuccessMessage({ published_date: formatISO(oneMinuteLater) } as any, {
          published_date: formatISO(tomorrow)
        })
      ).toBe('Your page has been updated');
    });
  });
});
