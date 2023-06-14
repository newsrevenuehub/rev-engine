import { render, screen, fireEvent } from 'test-utils';

import EditButton from './EditButton';
import PagePreview from 'assets/images/page_preview.png';
import { BUTTON_TYPE } from 'constants/buttonConstants';

import { styleLive, styleNotLive } from './__mock__';

const onClick = jest.fn();

const page_screenshot = PagePreview;
const published_date = '2021-11-18T21:51:53Z';
const name = 'Published page';

describe('EditButton', () => {
  describe('type = page', () => {
    it('should render page name', () => {
      render(<EditButton name={name} onClick={onClick} />);
      const pageName = screen.getByText(name);
      expect(pageName).toBeVisible();
    });

    it('should call onClick when clicked', () => {
      render(<EditButton name={name} onClick={onClick} type={BUTTON_TYPE.PAGE} />);

      const button = screen.getByRole('button');
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(onClick).toBeCalledTimes(1);
    });

    it('should render page preview image', () => {
      render(<EditButton page_screenshot={page_screenshot} name={name} onClick={onClick} />);

      const button = screen.getByRole('button');
      expect(button).toBeEnabled();

      const bgHolder = screen.getByTestId('background-image');
      expect(bgHolder).toHaveAttribute('style', `background-image: url(${page_screenshot});`);

      const noPreview = screen.queryByText(/no preview/i);
      expect(noPreview).not.toBeInTheDocument();
    });

    it('should render page "no preview" text', () => {
      render(<EditButton page_screenshot={null} name={name} onClick={onClick} type={BUTTON_TYPE.PAGE} />);

      const button = screen.getByRole('button');
      expect(button).toBeEnabled();

      const bgHolder = screen.getByTestId('background-image');
      expect(bgHolder).not.toHaveAttribute('style', /background-image/i);

      const noPreview = screen.getByText(/no preview/i);
      expect(noPreview).toBeVisible();
    });

    it('should render "live" tag', () => {
      render(<EditButton published_date={published_date} name={name} onClick={onClick} />);

      const live = screen.getByText(/live/i);
      expect(live).toBeVisible();
    });

    it('should not render "live" tag', () => {
      render(<EditButton published_date={null} name={name} onClick={onClick} type={BUTTON_TYPE.PAGE} />);

      const live = screen.queryByText(/live/i);
      expect(live).toBeNull();
    });
  });

  describe('type = style', () => {
    it('should render style name', () => {
      render(<EditButton {...styleLive} onClick={onClick} type={BUTTON_TYPE.STYLE} />);
      const pageName = screen.getByText(styleLive.name);
      expect(pageName).toBeVisible();
    });

    it('should call onClick when clicked', () => {
      render(<EditButton name="" onClick={onClick} type={BUTTON_TYPE.STYLE} />);

      const button = screen.getByRole('button');
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(onClick).toBeCalledTimes(1);
    });

    it('should render 4 colors in the background', () => {
      render(<EditButton {...styleLive} onClick={onClick} type={BUTTON_TYPE.STYLE} />);

      const button = screen.getByRole('button');
      expect(button).toBeEnabled();

      const bgHolder = screen.getAllByTestId('custom-color');
      expect(bgHolder).toHaveLength(4);
    });

    it('should render "live" tag', () => {
      render(<EditButton {...styleLive} onClick={onClick} type={BUTTON_TYPE.STYLE} />);

      const live = screen.getByTestId(`style-${styleLive.style.id}-live`);
      expect(live).toBeVisible();
    });

    it('should not render "live" tag', () => {
      render(<EditButton {...styleNotLive} onClick={onClick} type={BUTTON_TYPE.STYLE} />);

      const live = screen.queryByTestId(`style-${styleNotLive.style.id}-live`);
      expect(live).toBeNull();
    });
  });
});
