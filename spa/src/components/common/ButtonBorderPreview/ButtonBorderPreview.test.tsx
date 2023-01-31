import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';

import ButtonBorderPreview, { ButtonBorderPreviewProps } from './ButtonBorderPreview';

describe('ButtonBorderPreview', () => {
  function tree(props?: Partial<ButtonBorderPreviewProps>) {
    return render(<ButtonBorderPreview {...props} />);
  }

  it('should default the border radius to 0', () => {
    tree();
    expect(screen.getByTestId('border-button')).toHaveStyle(`border-radius: 0px;`);
  });

  it('should apply custom border radius', () => {
    tree({ borderRadius: 10 });
    expect(screen.getByTestId('border-button')).toHaveStyle(`border-radius: 10px;`);
  });

  it('should be accessible', async () => {
    const { container } = tree();
    expect(await axe(container)).toHaveNoViolations();
  });
});
