import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Instructions from './Instructions';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';

function tree() {
  return render(<Instructions />);
}

describe('Instructions', () => {
  it('shows a link to the knowledge base', () => {
    tree();
    expect(screen.getByRole('link', { name: 'Visit our knowledge base.' })).toHaveAttribute('href', KNOWLEDGE_BASE_URL);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
