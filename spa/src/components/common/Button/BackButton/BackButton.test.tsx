import { axe } from 'jest-axe';
import { render, screen, fireEvent } from 'test-utils';

import BackButton, {DEFAULT_BACK_BUTTON_TEXT} from './BackButton';


const onClick = jest.fn();

const props = {
  onClick
};



describe('BackButton', () => {

  it('should render back button with default text', () => {
    render(<BackButton {...props} />);
    const button = screen.getByRole('button', {name: DEFAULT_BACK_BUTTON_TEXT});
    expect(button).toBeEnabled();
  });

  it('should have an onClick callback function', () => {
    render(<BackButton {...props} />);
    const button = screen.getByRole('button', {name: DEFAULT_BACK_BUTTON_TEXT});
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render back button with custom text when text passed as prop', () => {
    const text = 'Foo';
    render(<BackButton {...{...props, text} } />);
    const button = screen.getByRole('button', {name: text});
    expect(button).toBeEnabled();
  });

  it('should be accessible', async () => {
    const { container } = render(<BackButton {...props} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
