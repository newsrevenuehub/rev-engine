import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { DonationPageContext } from 'components/donationPage/DonationPage';
import Graphic from './Graphic';

jest.mock('hooks/useImageSource');

function tree(graphic?: string) {
  return render(
    <DonationPageContext.Provider value={{ page: { graphic } } as any}>
      <Graphic />
    </DonationPageContext.Provider>
  );
}

describe('Graphic', () => {
  it('shows nothing if the page has no graphic', () => {
    tree();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows an image with no alt text if the page has a graphic', () => {
    tree('test-image.jpeg');

    const image = screen.getByRole('img');

    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('src', 'mock-use-image-source-test-image.jpeg');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
