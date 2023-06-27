import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import IconPreview, { IconPreviewProps } from './IconPreview';

function tree(props?: Partial<IconPreviewProps>) {
  return render(<IconPreview icon={<div data-testid="mock-icon" />} {...props} />);
}

describe('IconPreview', () => {
  it('displays the icon', () => {
    tree();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
