import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import FeatureBadge, { FeatureBadgeProps } from './FeatureBadge';

function tree(props?: Partial<FeatureBadgeProps>) {
  return render(<FeatureBadge type="CORE" {...props} />);
}

describe('FeatureBadge', () => {
  describe.each([['CORE'], ['CUSTOM']])('For the %s type', (type) => {
    it('displays the correct type text', () => {
      tree({ type } as any);

      expect(screen.getByText(`${type} feature`, { exact: false })).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ type } as any);

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
