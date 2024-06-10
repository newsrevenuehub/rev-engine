import { axe } from 'jest-axe';
import { render, screen, fireEvent, waitFor } from 'test-utils';

import CopyInputButton from './CopyInputButton';

const setCopied = jest.fn();

const props = {
  title: 'Contribution Page Link',
  link: 'www.pagelink.com',
  copied: '',
  setCopied
};

const mockClipboard = {
  writeText: jest.fn()
};

(global.navigator as any).clipboard = mockClipboard;

describe('CopyInputButton', () => {
  it('should render input', () => {
    render(<CopyInputButton {...props} />);
    const input = screen.getByRole('textbox', { name: props.title });
    expect(input).toHaveValue(props.link);
  });

  it('should render copy button', () => {
    render(<CopyInputButton {...props} />);
    const button = screen.getByRole('button', { name: `Copy ${props.title}` });
    expect(button).toBeEnabled();
  });

  it('should call setCopied when button is clicked', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);
    render(<CopyInputButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: `Copy ${props.title}` }));
    await waitFor(() => {
      expect(setCopied).toHaveBeenCalledWith(props.link);
    });
  });

  it('should copy link to clipboard', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);
    render(<CopyInputButton {...props} />);

    fireEvent.click(screen.getByRole('button', { name: `Copy ${props.title}` }));
    expect(mockClipboard.writeText.mock.calls).toEqual([[props.link]]);
  });

  it('should show error message if link fail to clipboard', async () => {
    mockClipboard.writeText.mockRejectedValue(undefined);
    render(<CopyInputButton {...props} />);

    fireEvent.click(screen.getByRole('button', { name: `Copy ${props.title}` }));
    await waitFor(() => {
      expect(screen.getByText(/Failed to copy link automatically/i)).toBeVisible();
    });
  });

  it('should render Copied if copied has the same value as link', async () => {
    render(<CopyInputButton {...props} copied={props.link} />);
    expect(screen.getByRole('button', { name: `Copied ${props.title}` })).toBeEnabled();
    expect(screen.queryByRole('button', { name: `Copy ${props.title}` })).toBeNull();
  });

  it('should be accessible', async () => {
    const { container } = render(<CopyInputButton {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
