import { render, screen, fireEvent } from 'test-utils';
import { BUTTON_TYPE } from 'constants/buttonConstants';

import NewButton from './NewButton';

const onClick = jest.fn();

describe('NewButton', () => {
  it('should render default new page button and label', () => {
    render(<NewButton onClick={onClick} />);

    const buttonLabel = screen.getByText(/new page/i);
    expect(buttonLabel).toBeVisible();

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
  });

  it('should render new style button and label', () => {
    render(<NewButton type={BUTTON_TYPE.STYLE} onClick={onClick} />);

    const buttonLabel = screen.getByText(/new style/i);
    expect(buttonLabel).toBeVisible();

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
  });

  it('should call onClick when button is clicked', () => {
    render(<NewButton type={BUTTON_TYPE.STYLE} onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
