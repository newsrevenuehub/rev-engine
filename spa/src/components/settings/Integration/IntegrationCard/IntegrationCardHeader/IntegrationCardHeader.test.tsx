import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import IntegrationCardHeader, { IntegrationCardHeaderProps } from './IntegrationCardHeader';

const card = {
  image: 'mock-logo',
  title: 'mock-title',
  isRequired: true,
  site: {
    label: 'mock-label',
    url: 'mock-url'
  }
};

describe('Integration Card', () => {
  function tree(props?: Partial<IntegrationCardHeaderProps>) {
    return render(<IntegrationCardHeader {...card} {...props} />);
  }

  it('should render texts on card header', () => {
    tree();

    expect(screen.getByText(card.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: card.site.label })).toHaveAttribute('href', card.site.url);
  });

  it('should render image', () => {
    tree();
    expect(screen.getByRole('img', { name: `${card.title} logo` })).toHaveAttribute('src', card.image);
  });

  it('should render required tag if enableCornerMessage = true', () => {
    tree({ enableCornerMessage: true });
    expect(screen.getByText('*Required')).toBeVisible();
  });

  it('should not render required tag by default', () => {
    tree();
    expect(screen.queryByText('*Required')).not.toBeInTheDocument();
  });

  it('should render corner message if enableCornerMessage = true', () => {
    tree({ isRequired: false, cornerMessage: 'mock-corner-message', enableCornerMessage: true });
    expect(screen.getByText('mock-corner-message')).toBeVisible();
  });

  it('should not render corner message by default', () => {
    tree({ isRequired: false, cornerMessage: 'mock-corner-message' });
    expect(screen.queryByText('mock-corner-message')).not.toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
