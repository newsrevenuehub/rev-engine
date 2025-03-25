import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';
import UserNeeded, { UserNeededProps } from './UserNeeded';

function tree(props?: Partial<UserNeededProps>) {
  return render(<UserNeeded onClose={jest.fn()} {...props} />);
}

describe('UserNeeded', () => {
  it('shows links to the knowledge base', () => {
    tree();
    expect(screen.getByRole('link', { name: 'Knowledge Base' })).toHaveAttribute('href', KNOWLEDGE_BASE_URL);
    expect(screen.getByRole('link', { name: 'Learn more about adding users in ActiveCampaign.' })).toHaveAttribute(
      'href',
      KNOWLEDGE_BASE_URL
    );
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
