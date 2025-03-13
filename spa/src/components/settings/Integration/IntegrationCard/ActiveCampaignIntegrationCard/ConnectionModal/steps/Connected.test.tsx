import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import Connected, { ConnectedProps } from './Connected';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';

function tree(props?: Partial<ConnectedProps>) {
  return render(<Connected onClose={jest.fn()} serverUrl="test-server-url" {...props} />);
}

describe('Connected', () => {
  it('links to the Revenue Hub knowledge base', () => {
    tree();
    expect(screen.getByRole('link', { name: 'RevEngine Knowledge Base' })).toHaveAttribute('href', KNOWLEDGE_BASE_URL);
  });

  it('links to the ActiveCampaign settings page', () => {
    tree();
    expect(screen.getByRole('link', { name: 'Go To Settings' })).toHaveAttribute(
      'href',
      'test-server-url/app/settings/account/'
    );
  });

  it('shows a button that calls the onClose prop when clicked', () => {
    const onClose = jest.fn();

    tree({ onClose });
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish & Close' }));
    expect(onClose).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
