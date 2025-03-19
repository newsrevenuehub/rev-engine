import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import EnterApiKey, { EnterApiKeyProps } from './EnterApiKey';

function tree(props?: Partial<EnterApiKeyProps>) {
  return render(<EnterApiKey onPreviousStep={jest.fn()} onSetKeyAndUrl={jest.fn()} {...props} />);
}

describe('EnterApiKey', () => {
  it('shows a button to go to the previous step', () => {
    const onPreviousStep = jest.fn();

    tree({ onPreviousStep });
    expect(onPreviousStep).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous Step' }));
    expect(onPreviousStep).toBeCalledTimes(1);
  });

  it('shows two text fields for entering an API key and server URL', () => {
    tree();
    expect(screen.getByRole('textbox', { name: 'API Key' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'API URL' })).toBeVisible();
  });

  it('calls the onSetKeyAndUrl prop if both values are entered', () => {
    const onSetKeyAndUrl = jest.fn();

    tree({ onSetKeyAndUrl });
    fireEvent.change(screen.getByRole('textbox', { name: 'API Key' }), { target: { value: 'test-key' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'API URL' }), { target: { value: 'https://test-url.org' } });
    expect(onSetKeyAndUrl).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish Connection' }));
    expect(onSetKeyAndUrl.mock.calls).toEqual([['test-key', 'https://test-url.org']]);
  });

  it("disables the Finish Connection button and doesn't allow form submit if the API key is omitted", () => {
    const onSetKeyAndUrl = jest.fn();

    tree({ onSetKeyAndUrl });
    fireEvent.change(screen.getByRole('textbox', { name: 'API URL' }), { target: { value: 'https://test-url.org' } });
    expect(screen.getByRole('button', { name: 'Finish Connection' })).toBeDisabled();
    fireEvent.submit(document.querySelector('form')!);
    expect(onSetKeyAndUrl).not.toBeCalled();
  });

  it("disables the Finish Connection button and doesn't allow form submit if the server URL is omitted", () => {
    const onSetKeyAndUrl = jest.fn();

    tree({ onSetKeyAndUrl });
    fireEvent.change(screen.getByRole('textbox', { name: 'API Key' }), { target: { value: 'test-key' } });
    expect(screen.getByRole('button', { name: 'Finish Connection' })).toBeDisabled();
    fireEvent.submit(document.querySelector('form')!);
    expect(onSetKeyAndUrl).not.toBeCalled();
  });

  it("enables the Finish Connection button, but doesn't call onSetKeyAndUrl if the server URL isn't a URL", () => {
    const onSetKeyAndUrl = jest.fn();

    tree({ onSetKeyAndUrl });
    fireEvent.change(screen.getByRole('textbox', { name: 'API Key' }), { target: { value: 'test-key' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'API URL' }), { target: { value: 'bad' } });
    expect(onSetKeyAndUrl).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish Connection' }));
    expect(onSetKeyAndUrl).not.toBeCalled();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
