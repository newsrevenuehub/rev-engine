import slugify from './slugify';

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
