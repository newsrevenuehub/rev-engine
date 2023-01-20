import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import OrganizationMenu, { OrganizationMenuProps } from './OrganizationMenu';

const title = 'mock-rp-name';

describe('OrganizationMenu', () => {
  function tree(props?: Partial<OrganizationMenuProps>) {
    return render(<OrganizationMenu title={title} {...props} />);
  }

  it('should render rp name', () => {
    tree();

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
