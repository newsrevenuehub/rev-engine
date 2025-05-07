import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ImageEditor, { ImageEditorProps } from './ImageEditor';

jest.mock('components/base/ImageUpload/ImageUpload');

const testFile = new File(['abc'], 'test.jpeg', { type: 'image/jpeg' });

function tree(props?: Partial<ImageEditorProps>) {
  return render(
    <ImageEditor
      elementContent={undefined}
      elementRequiredFields={[]}
      contributionIntervals={[]}
      onChangeElementContent={jest.fn()}
      onChangeElementRequiredFields={jest.fn()}
      setUpdateDisabled={jest.fn()}
      {...props}
    />
  );
}

describe('ImageEditor', () => {
  describe('When element content is a file', () => {
    it("sets the image upload component's props appropriately", () => {
      tree({ elementContent: testFile });

      const upload = screen.getByTestId('mock-image-upload');

      expect(upload.dataset.value).toBe(testFile.toString());
      expect(upload.dataset.thumbnailUrl).toBe('');
    });

    it('is accessible', async () => {
      const { container } = tree({ elementContent: testFile });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When element content is a string URL', () => {
    it("sets the image upload component's props appropriately", () => {
      tree({ elementContent: { url: 'test-url' } });

      const upload = screen.getByTestId('mock-image-upload');

      expect(upload.dataset.value).toBe('test-url');
      expect(upload.dataset.thumbnailUrl).toBe('test-url');
    });

    describe('When a file is added by the user', () => {
      it('changes element content when a file', () => {
        const onChangeElementContent = jest.fn();

        tree({ onChangeElementContent, elementContent: { url: 'test-url' } });
        expect(onChangeElementContent).not.toBeCalled();
        fireEvent.click(screen.getByTestId('mock-image-upload'));
        expect(onChangeElementContent.mock.calls).toEqual([[expect.any(File)]]);
      });

      it('shows a validation error and blocks update if the file is larger than 2.5 MB', () => {
        const setUpdateDisabled = jest.fn();

        tree({ setUpdateDisabled, elementContent: { url: 'test-url' } });
        expect(setUpdateDisabled).not.toBeCalled();
        fireEvent.click(screen.getByText('add large image'));
        expect(screen.getByText('This file exceeds the limit of 2.5 MB.')).toBeVisible();
        expect(setUpdateDisabled.mock.calls).toEqual([[true]]);
      });

      it('shows no validation error and allows update if the file is smaller than 2.5 MB', () => {
        const setUpdateDisabled = jest.fn();

        tree({ setUpdateDisabled, elementContent: { url: 'test-url' } });
        expect(setUpdateDisabled).not.toBeCalled();
        fireEvent.click(screen.getByTestId('mock-image-upload'));
        expect(screen.queryByText('This file exceeds the limit of 2.5 MB.')).not.toBeInTheDocument();
        expect(setUpdateDisabled.mock.calls).toEqual([[false]]);
      });
    });

    it('is accessible', async () => {
      const { container } = tree({ elementContent: { url: 'test-url' } });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When element content is undefined', () => {
    it("sets the image upload component's props appropriately", () => {
      tree();

      const upload = screen.getByTestId('mock-image-upload');

      expect(upload.dataset.value).toBeUndefined();
      expect(upload.dataset.thumbnailUrl).toBe('');
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
