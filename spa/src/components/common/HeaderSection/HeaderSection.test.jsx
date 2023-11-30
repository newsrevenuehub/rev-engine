import { render, screen } from 'test-utils';
import HeaderSection from './HeaderSection';

const headerTitle = 'Page title';

describe('Header Section', () => {
  it('should render title and no subtitle by default', () => {
    render(<HeaderSection title={headerTitle} />);

    const title = screen.getByText(headerTitle);
    expect(title).toBeInTheDocument();

    const subtitle = screen.queryByTestId('subtitle');
    expect(subtitle).not.toBeInTheDocument();
  });

  it('should render title and subtitle', () => {
    const subtitleText = 'This is the description that goes under the title';
    render(<HeaderSection title={headerTitle} subtitle={subtitleText} />);

    const title = screen.getByText(headerTitle);
    expect(title).toBeInTheDocument();

    const subtitle = screen.getByText(subtitleText);
    expect(subtitle).toBeInTheDocument();
  });
});
