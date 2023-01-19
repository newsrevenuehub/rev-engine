import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import SubheaderSection, { SubheaderSectionProps } from './SubheaderSection';

const title = 'Page title';
const subtitle = 'This is the description that goes under the title';

describe('Subheader Section', () => {
  function tree(props?: Partial<SubheaderSectionProps>) {
    return render(<SubheaderSection title={title} {...props} />);
  }

  it('should render title and no subtitle by default', () => {
    tree();

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByTestId('subheader-subtitle')).not.toBeInTheDocument();
  });

  it('should render title and subtitle', () => {
    tree({ subtitle });

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree({ subtitle });
    expect(await axe(container)).toHaveNoViolations();
  });
});
