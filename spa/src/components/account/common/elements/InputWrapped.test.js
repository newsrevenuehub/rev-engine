import { render, screen, fireEvent } from 'test-utils';

import InputWrapped from './InputWrapped';
import Input from 'elements/inputs/Input';

const onChangeMock = jest.fn();

it('should show toggle button for password input', () => {
  render(<InputWrapped value={''} onChange={onChangeMock} type={Input.types.PASSWORD} />);
  const toggleIcon = screen.getByTestId('toggle');
  expect(toggleIcon).toBeInTheDocument();
});

it('should not show toggle button for text input', () => {
  render(<InputWrapped value={''} onChange={onChangeMock} type={Input.types.TEXT} />);
  const toggleIcon = screen.queryByTestId('toggle');
  expect(toggleIcon).not.toBeInTheDocument();
});

it('should show show/hide value of password if visibility icon is clicked', () => {
  render(<InputWrapped value={'password'} onChange={onChangeMock} type={Input.types.PASSWORD} />);
  const toggleIcon = screen.getByTestId('toggle');
  fireEvent.click(toggleIcon);
  expect(screen.getByTestId(`inp-${Input.types.TEXT}`)).toBeInTheDocument();
  fireEvent.click(toggleIcon);
  expect(screen.getByTestId(`inp-${Input.types.PASSWORD}`)).toBeInTheDocument();
});

it('should show label if provided', () => {
  render(<InputWrapped label={'email'} value={''} onChange={onChangeMock} type={Input.types.EMAIL} />);
  expect(screen.getByTestId('label')).toBeInTheDocument();
});

it('should not show label if not provided', () => {
  render(<InputWrapped value={''} onChange={onChangeMock} type={Input.types.EMAIL} />);
  expect(screen.queryByTestId('label')).not.toBeInTheDocument();
});

it('should show instructions if they are provided', () => {
  render(
    <InputWrapped
      label={'email'}
      instructions={'enter valid email'}
      value={''}
      onChange={onChangeMock}
      type={Input.types.EMAIL}
    />
  );
  expect(screen.getByTestId('instructions')).toBeInTheDocument();
});

it('should not show instructions if instructions are not provided', () => {
  render(<InputWrapped value={''} onChange={onChangeMock} type={Input.types.EMAIL} />);
  expect(screen.queryByTestId('instructions')).not.toBeInTheDocument();
});

it('should show errorMessage if errorMessage is provided', () => {
  render(
    <InputWrapped
      label={'email'}
      errorMessage={'invalid email!'}
      value={''}
      onChange={onChangeMock}
      type={Input.types.EMAIL}
    />
  );
  expect(screen.getByTestId('error')).toBeInTheDocument();
});

it('should not show errorMessage if errorMessage are not provided', () => {
  render(<InputWrapped value={''} onChange={onChangeMock} type={Input.types.EMAIL} />);
  expect(screen.queryByTestId('error')).not.toBeInTheDocument();
});
