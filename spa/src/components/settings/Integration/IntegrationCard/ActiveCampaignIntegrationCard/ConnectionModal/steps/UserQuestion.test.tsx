import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import UserQuestion, { UserQuestionProps } from './UserQuestion';

function tree(props?: Partial<UserQuestionProps>) {
  return render(<UserQuestion onNextStep={jest.fn()} {...props} />);
}

describe('UserQuestion', () => {
  it("disables the next step button and doesn't allow form submit initially", () => {
    const onNextStep = jest.fn();

    tree({ onNextStep });
    expect(screen.getByRole('button', { name: 'Next Step' })).toBeDisabled();
    fireEvent.submit(document.querySelector('form')!);
    expect(onNextStep).not.toBeCalled();
  });

  it.each([
    [true, 'Yes, my plan has an additional user'],
    [false, "No, my plan doesn't have an additional user"]
  ])('calls the onNextStep prop with a %s argument if the user chooses the "%s" radio button', (created, name) => {
    const onNextStep = jest.fn();

    tree({ onNextStep });
    expect(onNextStep).not.toBeCalled();
    fireEvent.click(screen.getByRole('radio', { name }));
    fireEvent.click(screen.getByRole('button', { name: 'Next Step' }));
    expect(onNextStep.mock.calls).toEqual([[created]]);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
