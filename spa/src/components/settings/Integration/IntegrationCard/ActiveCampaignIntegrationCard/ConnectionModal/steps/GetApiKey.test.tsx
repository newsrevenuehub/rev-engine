import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import GetApiKey, { GetApiKeyProps } from './GetApiKey';

function tree(props?: Partial<GetApiKeyProps>) {
  return render(<GetApiKey onNextStep={jest.fn()} onPreviousStep={jest.fn()} {...props} />);
}

describe('GetApiKey', () => {
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
