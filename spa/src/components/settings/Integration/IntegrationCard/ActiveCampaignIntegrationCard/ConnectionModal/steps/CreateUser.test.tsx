import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import CreateUser, { CreateUserProps } from './CreateUser';

function tree(props?: Partial<CreateUserProps>) {
  return render(<CreateUser onNextStep={jest.fn()} onPreviousStep={jest.fn()} {...props} />);
}

describe('CreateUser', () => {
  it('shows a button to go to the next step', () => {
    const onNextStep = jest.fn();

    tree({ onNextStep });
    expect(onNextStep).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next Step' }));
    expect(onNextStep).toBeCalledTimes(1);
  });

  it('shows a button to go to the previous step', () => {
    const onPreviousStep = jest.fn();

    tree({ onPreviousStep });
    expect(onPreviousStep).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous Step' }));
    expect(onPreviousStep).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
