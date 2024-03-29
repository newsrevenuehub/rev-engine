import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import OffscreenText from './OffscreenText';

function tree(text: string) {
  return render(<OffscreenText>{text}</OffscreenText>);
}

describe('OffscreenText', () => {
  it('displays the text in children', () => {
    tree('test');
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree('test');

    expect(await axe(container)).toHaveNoViolations();
  });
});
