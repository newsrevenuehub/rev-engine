import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DRichText, { DRichTextProps } from './DRichText';

describe('DRichText', () => {
  function tree(props?: Partial<DRichTextProps>) {
    // This renders to a <li> which needs a container for AX purposes.

    return render(
      <ul>
        <DRichText element={{ content: 'mock-content', type: 'DRichText', uuid: 'mock-uuid' }} {...props} />
      </ul>
    );
  }

  it('displays the element content as HTML', () => {
    tree({ element: { content: '<b>test</b>', type: 'DRichText', uuid: 'mock-uuid' } });
    expect(screen.getByText('test')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
