import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import EnginePlanBadge, { EnginePlanBadgeProps } from './EnginePlanBadge';

function tree(props?: Partial<EnginePlanBadgeProps>) {
  return render(<EnginePlanBadge plan="FREE" {...props} />);
}

describe('EnginePlanBadge', () => {
  describe.each([['CORE'], ['FREE'], ['PLUS']])('For the %s plan', (plan) => {
    it('displays the plan name', () => {
      tree({ plan } as any);

      expect(screen.getByText(plan)).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ plan } as any);

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
