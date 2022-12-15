import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import RichTextDisplay, { RichTextDisplayProps } from './RichTextDisplay';

describe('RichTextDisplay', () => {
  function tree(props?: Partial<RichTextDisplayProps>) {
    return render(<RichTextDisplay html="mock-html" {...props} />);
  }

  it('renders the html prop', () => {
    tree({ html: '<b>test</b>' });
    expect(screen.getByText('test')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
