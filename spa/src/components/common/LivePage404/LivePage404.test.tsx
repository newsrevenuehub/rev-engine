import { render, screen } from 'test-utils';
import LivePage404, { LivePage404Props } from './LivePage404';

describe('LivePage404', () => {
  const tree = (props?: Partial<LivePage404Props>) => {
    return render(<LivePage404 {...props} />);
  };

  it('renders', () => {
    tree();
    expect(screen.getByTestId('live-page-404')).toBeInTheDocument();
  });

  it('renders redirect link by default', () => {
    tree();
    expect(screen.getByRole('link', { name: /this page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /this page/i })).toHaveAttribute(
      'href',
      'https://fundjournalism.org/?utm_campaign=404#donate'
    );
  });

  it('renders redirect link when hideRedirect is false', () => {
    tree({ hideRedirect: false });
    expect(screen.getByRole('link', { name: /this page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /this page/i })).toHaveAttribute(
      'href',
      'https://fundjournalism.org/?utm_campaign=404#donate'
    );
  });

  it('does not render redirect link when hideRedirect is true', () => {
    tree({ hideRedirect: true });
    expect(screen.queryByRole('link', { name: /this page/i })).not.toBeInTheDocument();
  });
});
