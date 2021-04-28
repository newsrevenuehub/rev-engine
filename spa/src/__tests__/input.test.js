import Input from 'components/elements/inputs/Input';
import { render, screen } from 'test_utils/test-utils';


const requiredProps = {
  value: "",
  onChange: () => {},
};

test('it logs errors if required props are missing', async () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");
  render(<Input />);
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
});

test('it renders a label when label prop is present', async () => {
  const label = "My Label";
  render(<Input label={label} {...requiredProps} />)
  expect(screen.getByText(label)).toHaveTextContent(label);
});

test('it renders errors when errors prop is present', async () => {
  const errors = [
    "My First Test Error",
    "My Second Test Error",
  ]
  render(<Input errors={errors} {...requiredProps} />);

  errors.forEach(error => {
    expect(screen.getByText(error)).toHaveTextContent(error);
  })
});
