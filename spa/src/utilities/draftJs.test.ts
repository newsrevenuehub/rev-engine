import { alignClassNames, editorStateToHtml, fontSizeClassNames, htmlToEditorState } from './draftJs';

describe('draftJs conversion functions', () => {
  function roundTrip(html: string) {
    return editorStateToHtml(htmlToEditorState(html));
  }

  // The DraftJS editor state object is pretty opaque. In lieu of testing output
  // directly, we roundtrip HTML through the conversion functions to prove that
  // they do what we want.

  it.each([
    ['paragraphs', '<p>test</p>'],
    ['<strong> tags', '<p><strong>test</strong></p>'],
    ['<em> tags', '<p><em>test</em></p>'],
    ['<del> tags', '<p><del>test</del></p>'],
    ['<h2> tags', '<h2>test</h2>'],
    ['<h3> tags', '<h3>test</h3>'],
    ['<h4> tags', '<h4>test</h4>'],
    ['<blockquote> tags', '<blockquote>test</blockquote>'],
    ['<a> tags', '<p><a href="https://fundjournalism.org" title="test">test</a></p>']
  ])('preserves %s', (_, html) => expect(roundTrip(html)).toBe(html));

  // Roundtripping <ol>s and <uls> causes some whitespace-only formatting.

  it.each([['ol', 'ul']])('preserves <%s> tags', (tag) =>
    expect(roundTrip(`<${tag}><li>1</li><li>2</li></${tag}>`)).toBe(`<${tag}>\n  <li>1</li>\n  <li>2</li>\n</${tag}>`)
  );

  it.each(Object.entries(alignClassNames))('converts %s-aligned text to the CSS class "%s"', (align, className) =>
    expect(roundTrip(`<p style="text-align:${align}">test</p>`)).toBe(`<p class="${className}">test</p>`)
  );

  it.each(Object.values(alignClassNames))('preserves the CSS class "%s"', (className) =>
    expect(roundTrip(`<p class="${className}">test</p>`)).toBe(`<p class="${className}">test</p>`)
  );

  it.each(Object.entries(fontSizeClassNames))(
    'converts text with size %s to the CSS class "%s"',
    (fontSize, className) =>
      expect(roundTrip(`<p style="font-size:${fontSize}px">test</p>`)).toBe(
        `<p><span class="${className}">test</span></p>`
      )
  );

  it.each(Object.values(fontSizeClassNames))('preserves the CSS class "%s"', (className) =>
    expect(roundTrip(`<p class="${className}">test</p>`)).toBe(`<p><span class="${className}">test</span></p>`)
  );
});
