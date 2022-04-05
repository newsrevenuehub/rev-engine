import { render } from 'test-utils';

import { pagesbyRP } from './Pages';

describe('Given pages list', () => {
  let result;
  beforeEach(async () => {
    const inp = [
      { id: 'first', revenue_program: { id: 1, name: 'rp1' } },
      { id: 'second', revenue_program: { id: 2, name: 'rp2' } },
      { id: 'third', revenue_program: { id: 2, name: 'rp2' } }
    ];
    result = await pagesbyRP(inp);
  });

  it('should group pages by RevenueProgramin in pagesByRevProgram ', () => {
    expect(result.length).toEqual(2);
  });
});

describe('Given pages list having a page with a null rp', () => {
  let result;

  beforeEach(async () => {
    const inp = [
      { id: 'first', revenue_program: { id: 1, name: 'rp1' } },
      { id: 'second', revenue_program: { id: 2, name: 'rp2' } },
      { id: 'third', revenue_program: null }
    ];
    result = await pagesbyRP(inp);
  });

  it('should not throw an error and exclude the page with null rp from pagesByRevProgram', () => {
    expect(result.length).toEqual(2);
  });
});
