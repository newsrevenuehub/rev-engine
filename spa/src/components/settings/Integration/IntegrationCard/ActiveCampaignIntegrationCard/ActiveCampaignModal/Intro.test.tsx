import { axe } from 'jest-axe';
import { render } from 'test-utils';
import Intro from './Intro';

function tree() {
  return render(<Intro />);
}

describe('Intro', () => {
  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
