import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './Amount.stories';
import { MIN_CONTRIBUTION_AMOUNT, MAX_CONTRIBUTION_AMOUNT } from './constants';
import {
  MIN_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG,
  MAX_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG
} from './validator';

// Every component that is returned maps 1:1 with the stories, but they already contain all decorators from story level, meta level and global level.
const { Default, OneTime, WithDefaultFreeForm, FreeFormInputDisabled } = composeStories(stories);

test('when no amountFrequency (aka "one-time")', () => {
  render(<OneTime />);
  const { presetAmounts, amountCurrencySymbol } = OneTime.args;
  const expectedPresetLabels = presetAmounts.map((amount) => `${amountCurrencySymbol}${amount}`);
  expectedPresetLabels.forEach((label) => {
    expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
  });
  expect(screen.queryByTestId('frequency-string')).not.toBeInTheDocument();
});

test('when amountFrequency provided', () => {
  render(<Default />);
  const { presetAmounts, amountCurrencySymbol, amountFrequency } = Default.args;
  const expectedPresetLabels = presetAmounts.map((amount) => `${amountCurrencySymbol}${amount} / ${amountFrequency}`);
  expectedPresetLabels.forEach((label) => {
    expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
  });
  expect(screen.getByTestId('frequency-string')).toHaveTextContent(`/ ${amountFrequency}`);
});

test('correctly displays preset amounts', () => {
  render(<Default />);
  Default.args.presetAmounts.forEach((amount, idx) => {
    const radio = screen.getByLabelText(
      `${Default.args.amountCurrencySymbol}${amount} / ${Default.args.amountFrequency}`
    );
    expect(radio).not.toBeNull();
    fireEvent.click(radio);
    expect(radio).toBeChecked();
  });
});

test('first preset is checked by default', () => {
  render(<Default />);
  const firstRadio = screen.getByLabelText(
    `${Default.args.amountCurrencySymbol}${Default.args.presetAmounts[0]} / ${Default.args.amountFrequency}`
  );
  expect(firstRadio).not.toBeNull();
  expect(firstRadio).toBeChecked();
});

test('entering value into free form input deselects preset radio group', () => {
  render(<Default />);
  const input = screen.getByLabelText('Choose your own value for amount');
  // // first preset option chosen by default
  expect(screen.getByRole('radio', { checked: true })).toBeInTheDocument();
  expect(input).toBeInTheDocument();
  expect(input.getAttribute('placeholder')).toBe('0.00');
  fireEvent.input(input, { target: { value: 23 } });
  expect(screen.queryByText('radio', { checked: true })).not.toBeInTheDocument();
});

test('when free form input disabled', () => {
  render(<FreeFormInputDisabled />);
  expect(screen.queryByLabelText('Choose your own value for amount')).not.toBeInTheDocument();
});

test('when default value for free form input', () => {
  render(<WithDefaultFreeForm />);
  // none of the presets should be checked
  expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument();
  // but all should be unchecked
  expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(WithDefaultFreeForm.args.presetAmounts.length);
  const input = screen.getByLabelText('Choose your own value for amount');
  expect(input).toHaveValue(WithDefaultFreeForm.args.defaultValue);
});

test('has first preset as default submission value', async () => {
  render(<Default />);
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(`${Default.args.submitSuccessMessage} ${Default.args.presetAmounts[0]}`);
});

test('has freeform default value as submission value', async () => {
  render(<WithDefaultFreeForm />);
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(`${WithDefaultFreeForm.args.submitSuccessMessage} ${WithDefaultFreeForm.args.defaultValue}`);
});

test('has user selected preset choice as submission value', async () => {
  render(<WithDefaultFreeForm />);
  const secondPreset = screen.getAllByRole('radio')[1];
  fireEvent.click(secondPreset);
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(
    `${WithDefaultFreeForm.args.submitSuccessMessage} ${WithDefaultFreeForm.args.presetAmounts[1]}`
  );
});

test('has user entered free form input as submission value', async () => {
  render(<Default />);
  const chosenValue = 37.37;
  const freeFormInput = screen.getByRole('spinbutton');
  fireEvent.change(freeFormInput, { target: { value: chosenValue } });
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(`${Default.args.submitSuccessMessage} ${chosenValue}`);
});

test('displays message when min amount validation error', async () => {
  render(<Default />);
  const chosenValue = MIN_CONTRIBUTION_AMOUNT - 0.1;
  const freeFormInput = screen.getByRole('spinbutton');
  fireEvent.change(freeFormInput, { target: { value: chosenValue } });
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(MIN_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG);
});

test('displays message when max amount validation error', async () => {
  render(<Default />);
  const chosenValue = MAX_CONTRIBUTION_AMOUNT + 0.1;
  const freeFormInput = screen.getByRole('spinbutton');
  fireEvent.change(freeFormInput, { target: { value: chosenValue } });
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(MAX_CONTRIBUTION_AMOUNT_VALIDATION_ERROR_MSG);
});
