import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DImage, { DImageProps } from './DImage';
import { ImageElement } from 'hooks/useContributionPage';
import { useImageSource } from 'hooks/useImageSource';

// Manually mocking so we can simulate the loading state.

jest.mock('hooks/useImageSource', () => ({
  useImageSource: jest.fn()
}));

const element: ImageElement = { content: { url: 'test-image' }, requiredFields: [], type: 'DImage', uuid: 'mock-uuid' };

function tree(props?: Partial<DImageProps>) {
  return render(
    <ul>
      <DImage element={element} {...props} />
    </ul>
  );
}

describe('DImage', () => {
  const useImageSourceMock = jest.mocked(useImageSource);

  beforeEach(() => {
    useImageSourceMock.mockImplementation((source?: null | string | File) => {
      if (!source) {
        return;
      }

      if (source instanceof File) {
        return `mock-use-image-source-${source.name}`;
      }

      return `mock-use-image-source-${source}`;
    });
  });

  it('shows nothing while useImageSource is generating a data URI', () => {
    useImageSourceMock.mockReturnValue(undefined);
    tree();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows an image with URL if specified as a string', () => {
    tree();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'mock-use-image-source-test-image');
  });

  it('gives the image empty alt text', () => {
    tree();
    expect(screen.getByRole('img')).toHaveAttribute('alt', '');
  });

  it('shows an iamge with data URI if specified as a file', () => {
    tree({ element: { ...element, content: new File(['abc'], 'test.jpeg') } });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'mock-use-image-source-test.jpeg');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
