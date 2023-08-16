import getDomain from './getDomain';
import slugify from './slugify';
import { pageLink, portalLink } from './getPageLinks';

describe('Test utilities', () => {
  const urlList = [
    { host: 'domain.com', domain: 'domain.com' },
    { host: 'subdomain.domain.com', domain: 'domain.com' },
    { host: 'subdomain.domain.co.uk', domain: 'domain.co.uk' }
    // TODO: solve limitation of function getDomain / getSubdomain.
    // Fails when testing for:
    // { host: 'domain.co.uk', domain: 'domain.co.uk' },
  ];

  describe('getDomain', () => {
    urlList.map((url) =>
      it(`test: ${url.host}`, () => {
        const domain = getDomain(url.host);
        expect(domain).toEqual(url.domain);
      })
    );
  });

  describe('getPageLinks', () => {
    const page = {
      slug: 'test',
      revenue_program: { slug: 'rv-slug' }
    };
    const currentDomain = getDomain(window.location.host);

    it(`pageLink: should return rv-slug.${currentDomain}/test`, () => {
      expect(pageLink(page)).toEqual(`rv-slug.${currentDomain}/test`);
    });

    it(`portalLink: should return rv-slug.${currentDomain}/contributor`, () => {
      expect(portalLink(page)).toEqual(`rv-slug.${currentDomain}/contributor`);
    });
  });

  const nameList = [
    ['Page 1', 'page-1'],
    ['Hello World', 'hello-world'],
    ['Hi.There', 'hithere'],
    ['TestPage', 'testpage'],
    ['My_New_page', 'mynewpage']
  ];

  describe('slugify', () => {
    it.each(nameList)('test: %s -> expects: %s', (input, output) => expect(slugify(input)).toBe(output));
  });
});
