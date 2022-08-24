import { render, screen, fireEvent } from 'test-utils';

import PageButton from './PageButton';
import PagePreview from 'assets/images/page_preview.png';

const onClick = jest.fn();

const page_screenshot = PagePreview;
const published_date = '2021-11-18T21:51:53Z';
const name = 'Published page';

describe('PageButton', () => {
  it('should render page name', () => {
    render(<PageButton name={name} onClick={onClick} />);
    const pageName = screen.getByText(name);
    expect(pageName).toBeVisible();
  });

  it('should call onClick when clicked', () => {
    render(<PageButton name={name} onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onClick).toBeCalledTimes(1);
  });

  it('should render page preview image', () => {
    render(<PageButton page_screenshot={page_screenshot} name={name} onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();

    const bgHolder = screen.getByTestId('background-image');
    expect(bgHolder).toHaveAttribute('style', `background-image: url(${page_screenshot});`);

    const noPreview = screen.queryByText(/no preview/i);
    expect(noPreview).not.toBeInTheDocument();
  });

  it('should render page "no preview" text', () => {
    render(<PageButton page_screenshot={null} name={name} onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();

    const bgHolder = screen.getByTestId('background-image');
    expect(bgHolder).not.toHaveAttribute('style', /background-image/i);

    const noPreview = screen.getByText(/no preview/i);
    expect(noPreview).toBeVisible();
  });

  it('should render "live" tag', () => {
    render(<PageButton published_date={published_date} name={name} onClick={onClick} />);

    const live = screen.getByText(/live/i);
    expect(live).toBeVisible();
  });

  it('should not render "live" tag', () => {
    render(<PageButton published_date={null} name={name} onClick={onClick} />);

    const live = screen.queryByText(/live/i);
    expect(live).toBeNull();
  });
});
