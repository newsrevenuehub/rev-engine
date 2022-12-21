import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import RichTextDisplay, { RichTextDisplayProps } from './RichTextDisplay';

jest.mock('dompurify', () => ({
  sanitize: (value: string) => `cleaned ${value}`
}));

describe('RichTextDisplay', () => {
  function tree(props?: Partial<RichTextDisplayProps>) {
    return render(<RichTextDisplay html="mock-html" {...props} />);
  }

  it('renders the html prop as cleaned by DOMPurify', () => {
    tree({ html: '<b>test</b>' });

    // These are two separate checks because the resulting HTML will be:
    // `cleaned <b>test</b>`

    expect(screen.getByText('cleaned')).toBeVisible();
    expect(screen.getByText('test')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
