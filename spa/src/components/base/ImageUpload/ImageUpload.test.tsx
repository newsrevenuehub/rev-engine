import { axe } from 'jest-axe';
import { fireEvent, render, screen, waitFor, within } from 'test-utils';
import ImageUpload, { ImageUploadProps } from './ImageUpload';

const mockFile = new File([], 'test.jpeg');

describe('ImageUpload', () => {
  function changeFile() {
    // Need to fire the event directly on the input.

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [mockFile] } });
  }

  function tree(props?: Partial<ImageUploadProps>) {
    return render(<ImageUpload id="mock-id" label="mock-label" onChange={jest.fn()} prompt="mock-prompt" {...props} />);
  }

  describe('When no image or thumbnail is set', () => {
    it('displays the prompt prop', () => {
      tree({ prompt: 'test-prompt' });
      expect(screen.getByText('test-prompt')).toBeVisible();
    });

    it('displays the label', () => {
      tree();
      expect(screen.getByText('mock-label')).toBeVisible();
    });

    it('sets the accept property of the file input based on the accept prop', () => {
      tree({ accept: 'test-accept' });
      expect(document.querySelector('input[type="file"]')).toHaveAttribute('accept', 'test-accept');
    });

    it('only accepts a single file', () => {
      tree();
      expect(document.querySelector('input[type="file"]')).not.toHaveAttribute('multiple');
    });

    it('calls the onChange prop with the file and a generated thumbnail when the file input is changed', async () => {
      const onChange = jest.fn();

      tree({ onChange });
      expect(onChange).not.toBeCalled();
      changeFile();
      await waitFor(() => expect(onChange).toBeCalled());
      expect(onChange.mock.calls).toEqual([[mockFile, expect.any(String)]]);
    });

    it('is accessible', async () => {
      const { container } = tree();
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When only a thumbnail is set', () => {
    it("doesn't show a prompt", () => {
      tree({ prompt: 'test-prompt', thumbnailUrl: 'mock-thumbnail' });
      expect(screen.queryByText('test-prompt')).not.toBeInTheDocument();
    });

    it('displays an image with the thumbnail', () => {
      tree({ prompt: 'test-prompt', thumbnailUrl: 'mock-thumbnail' });
      expect(screen.getByRole('img')).toHaveAttribute('src', 'mock-thumbnail');
    });

    it('calls the onChange prop with the file and a generated thumbnail when the file input is changed', async () => {
      const onChange = jest.fn();

      tree({ onChange, thumbnailUrl: 'mock-thumbnail' });
      expect(onChange).not.toBeCalled();
      changeFile();
      await waitFor(() => expect(onChange).toBeCalled());
      expect(onChange.mock.calls).toEqual([[mockFile, expect.any(String)]]);
    });

    it('enables the remove button', () => {
      tree({ thumbnailUrl: 'mock-thumbnail' });
      expect(screen.getByRole('button', { name: 'Remove' })).not.toBeDisabled();
    });

    it('calls the onChange prop with no arguments when the remove button is clicked', () => {
      const onChange = jest.fn();

      tree({ onChange, thumbnailUrl: 'mock-thumbnail' });
      expect(onChange).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      expect(onChange.mock.calls).toEqual([[]]);
    });

    it('is accessible', async () => {
      const { container } = tree({ thumbnailUrl: 'mock-thumbnail' });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When both a thumbnail and value is set', () => {
    it("doesn't show a prompt", () => {
      tree({ prompt: 'test-prompt', thumbnailUrl: 'mock-thumbnail', value: mockFile });
      expect(screen.queryByText('test-prompt')).not.toBeInTheDocument();
    });

    it('calls the onChange prop with the file and a generated thumbnail when the file input is changed', async () => {
      const onChange = jest.fn();

      tree({ onChange, thumbnailUrl: 'mock-thumbnail', value: mockFile });
      expect(onChange).not.toBeCalled();
      changeFile();
      await waitFor(() => expect(onChange).toBeCalled());
      expect(onChange.mock.calls).toEqual([[mockFile, expect.any(String)]]);
    });

    it('enables the remove button', () => {
      tree({ thumbnailUrl: 'mock-thumbnail', value: mockFile });
      expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled();
    });

    it('calls the onChange prop with no arguments when the remove button is clicked', () => {
      const onChange = jest.fn();

      tree({ onChange, thumbnailUrl: 'mock-thumbnail', value: mockFile });
      expect(onChange).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      expect(onChange.mock.calls).toEqual([[]]);
    });

    it('is accessible', async () => {
      const { container } = tree({ thumbnailUrl: 'mock-thumbnail', value: mockFile });
      expect(
        await axe(container, {
          rules: {
            // We are adding File.name to the alt attribute, which is redundant in this scenario.
            'image-redundant-alt': { enabled: false }
          }
        })
      ).toHaveNoViolations();
    });
  });
});
