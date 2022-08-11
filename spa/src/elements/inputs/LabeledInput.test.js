import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './LabeledInput.stories';
import { ARBITRARY_VALIDATION_ERROR_MESSAGE } from 'storybook/constants';

const { Default, NotRequired, HasPlaceholder, EmailType, HasDefaultValue, DoesntValidate } = composeStories(stories);

test('default', async () => {
  render(<Default required={false} type="text" />);
  const input = screen.getByLabelText(Default.args.labelText);
  expect(input.placeholder).toBeFalsy();
  expect(input.required).toBeFalsy();
  expect(input.type).toBe('text');
  expect(input.value).toBe('');
  fireEvent.change(input, { target: { value: "I'm a user" } });
  expect(input.value).toBe("I'm a user");
  const submit = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(submit);
  await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
});

test('has minimally a11y-compliant label', () => {
  render(<Default />);
  // the testing-library `name` param points to a user-accessible name for the label and ties this to an input
  // so this query is a minimal guarantee of a11y compliance
  const input = screen.getByLabelText(Default.args.labelText, { name: Default.args.labelText });
  expect(input).toBeInTheDocument();
  // TODO: https://github.com/nickcolley/jest-axe#testing-react
});

test('when required (lean on native HTML required)', async () => {
  render(<Default required={true} />);
  const input = screen.getByLabelText(Default.args.labelText);
  expect(input).toBeInTheDocument();
  expect(input.required).toBeTruthy();
});

test('when not required', () => {
  render(<NotRequired />);
  const input = screen.getByLabelText(NotRequired.args.labelText);
  expect(input).toBeInTheDocument();
  expect(input.required).toBeFalsy();
});

test('when email type', () => {
  render(<EmailType />);
  const input = screen.getByLabelText(Default.args.labelText);
  expect(input.type).toBe('email');
});

test('when placeholder', () => {
  render(<HasPlaceholder />);
  const input = screen.getByLabelText(HasPlaceholder.args.labelText);
  expect(input.placeholder).toBe(HasPlaceholder.args.placeholder);
});

test('when validation error', async () => {
  render(<DoesntValidate />);
  const submit = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(submit);
  const errorMessage = await screen.findByText(ARBITRARY_VALIDATION_ERROR_MESSAGE, { exact: false });
  expect(errorMessage).toBeInTheDocument();
});

test('when has default value', () => {
  render(<HasDefaultValue />);
  const input = screen.getByLabelText(HasDefaultValue.args.labelText);
  expect(input.value).toBe(HasDefaultValue.args.prefilledValue);
});
