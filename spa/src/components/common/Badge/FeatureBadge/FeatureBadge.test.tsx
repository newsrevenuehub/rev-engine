import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import FeatureBadge, { FeatureBadgeProps } from './FeatureBadge';

function tree(props?: Partial<FeatureBadgeProps>) {
  return render(<FeatureBadge type="CORE" {...props} />);
}

describe('FeatureBadge', () => {
  describe.each(['CORE', 'CUSTOM'] as Array<FeatureBadgeProps['type']>)('For the %s type', (type) => {
    it('displays the correct type text', () => {
      tree({ type });

      expect(screen.getByText(`${type} feature`, { exact: false })).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ type });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
