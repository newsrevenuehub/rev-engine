import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Appeal, { AppealProps } from './Appeal';

const defaultProps = {
  revenueProgram: {
    contributor_portal_show_appeal: true,
    website_url: 'https://example.com'
  }
};

function tree(props?: Partial<AppealProps>) {
  return render(<Appeal {...defaultProps} {...props} />);
}

describe('Appeal', () => {
  it('hides Appeal if contributor_portal_show_appeal = false', () => {
    tree({ revenueProgram: { ...defaultProps.revenueProgram, contributor_portal_show_appeal: false } });

    expect(document.body.textContent).toBe('');
  });

  it('shows Appeal if contributor_portal_show_appeal = true', () => {
    tree();
    expect(screen.getByTestId('appeal')).toBeInTheDocument();
  });

  describe('Keep Reading link', () => {
    it('shows link if website_url is defined', () => {
      tree();
      const link = screen.getByRole('link', { name: 'Keep Reading' });
      expect(link).toHaveAttribute('href', defaultProps.revenueProgram.website_url);
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('hides link if website_url is empty', () => {
      tree({ revenueProgram: { ...defaultProps.revenueProgram, website_url: '' } });
      expect(screen.queryByRole('link', { name: 'Keep Reading' })).not.toBeInTheDocument();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
