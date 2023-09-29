import { axe } from 'jest-axe';
import { fireEvent, render, screen, within } from 'test-utils';
import ContributionPageButton, { ContributionPageButtonProps } from './ContributionPageButton';

jest.mock('./DefaultPageButton');

const mockPage: any = {
  name: 'mock-page-name',
  page_screenshot: 'mock-page-screenshot',
  revenue_program: {
    default_donation_page: null
  }
};

function tree(props?: Partial<ContributionPageButtonProps>) {
  return render(<ContributionPageButton page={mockPage} {...props} />);
}

describe('ContributionPageButton', () => {
  it('displays a button with the page name as label', () => {
    tree();
    expect(screen.getByRole('button', { name: 'mock-page-name' })).toBeVisible();
  });

  it('displays the page screenshot', () => {
    tree();
    expect(screen.queryByText('No preview')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('preview-image')).getByRole('img')).toHaveAttribute('src', 'mock-page-screenshot');
  });

  it('displays "No Preview" when the page has no screenshot', () => {
    tree({ page: { ...mockPage, page_screenshot: null } });
    expect(screen.getByText('No preview')).toBeVisible();
  });

  it("doesn't display a live badge if the page is unpublished", () => {
    tree();
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('displays a live badge if the page is published', () => {
    tree({ page: { ...mockPage, published_date: new Date('January 1, 2000') } });
    expect(screen.getByText('LIVE')).toBeVisible();
  });

  it("doesn't display a DefaultPageButton if the page is not the default", () => {
    tree();
    expect(screen.queryByTestId('mock-default-page-button')).not.toBeInTheDocument();
  });

  it('displays a DefaultPageButton if the page is the default', () => {
    tree({ page: { ...mockPage, id: 'mock-id', revenue_program: { default_donation_page: 'mock-id' } } });
    expect(screen.getByTestId('mock-default-page-button')).toBeInTheDocument();
  });

  it('calls the onClick prop when the button is clicked', () => {
    const onClick = jest.fn();

    tree({ onClick });
    expect(onClick).not.toBeCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
