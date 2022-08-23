import { fireEvent, render, screen, within } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './PayFees.stories';

const { Default } = composeStories(stories);

test('defaults to unchecked', async () => {
  render(<Default />);
  const input = screen.getByLabelText(Default.args.payFeesLabelText, { checked: false });
  expect(input).toBeInTheDocument();
  expect(input).not.toBeChecked();
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  const successMessage = await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
  within(successMessage).getByText(JSON.stringify({ [Default.args.name]: Default.args.defaultChecked }), {
    exact: false
  });
});

test('can go from default unchecked to checked', async () => {
  render(<Default />);
  const input = screen.getByLabelText(Default.args.payFeesLabelText, { checked: false });
  expect(input).toBeInTheDocument();
  expect(input).not.toBeChecked();
  fireEvent.click(input);
  const nowChecked = screen.getByLabelText(Default.args.payFeesLabelText, { checked: true });
  expect(nowChecked).toBeChecked();
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  const successMessage = await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
  within(successMessage).getByText(JSON.stringify({ [Default.args.name]: true }), {
    exact: false
  });
});

test('can default to checked', async () => {
  render(<Default defaultChecked={true} />);
  const input = screen.getByLabelText(Default.args.payFeesLabelText, { checked: true });
  expect(input).toBeInTheDocument();
  expect(input).toBeChecked();
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  const successMessage = await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
  within(successMessage).getByText(JSON.stringify({ [Default.args.name]: true }), {
    exact: false
  });
});

test('can go from default checked to unchecked', async () => {
  render(<Default defaultChecked={true} />);
  const input = screen.getByLabelText(Default.args.payFeesLabelText, { checked: true });
  fireEvent.click(input);
  const nowUnchecked = screen.getByLabelText(Default.args.payFeesLabelText, { checked: false });
  expect(nowUnchecked).not.toBeChecked();
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  const successMessage = await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
  within(successMessage).getByText(JSON.stringify({ [Default.args.name]: false }), {
    exact: false
  });
});
