import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import PaidPlanContent, { PaidPlanContentProps } from './PaidPlanContent';

function tree(props?: Partial<PaidPlanContentProps>) {
  return render(<PaidPlanContent onClose={jest.fn()} onStartConnection={jest.fn()} {...props} />);
}

describe('PaidPlanContent', () => {
  it('shows an intro', () => {
    tree();
    expect(screen.getByTestId('intro')).toBeVisible();
  });

  it('shows a button that calls the onStartConnection prop', () => {
    const onStartConnection = jest.fn();

    tree({ onStartConnection });
    expect(onStartConnection).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start Connection' }));
    expect(onStartConnection).toBeCalledTimes(1);
  });

  it('shows a button that calls the onClose prop', () => {
    const onClose = jest.fn();

    tree({ onClose });
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Maybe Later' }));
    expect(onClose).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
