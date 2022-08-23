import { fireEvent, render, screen, within } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './Frequency.stories';
import { frequencyOptions } from './Frequency.stories';
import Frequency from './Frequency';

const { Default } = composeStories(stories);

test('is required by default', () => {
  render(<Default />);
  frequencyOptions.forEach(({ displayName }) => {
    const input = screen.getByLabelText(displayName);
    expect(input.required).toBe(true);
  });
});

test('has default checked index', () => {
  render(<Default />);
  const inputs = screen.getAllByRole('radio');
  expect(inputs).toHaveLength(frequencyOptions.length);
  expect(inputs.filter((input) => input.checked)).toHaveLength(1);
  expect(inputs.findIndex((input) => input.checked)).toBe(0);
  expect(inputs.find((input) => input.checked)).toBeTruthy();
});

test('submits its chosen value', async () => {
  render(<Default />);
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  const successMessage = await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
  within(successMessage).getByText(
    JSON.stringify({ [Default.args.name]: Default.args.frequencyOptions[Default.args.defaultCheckedIndex].value }),
    {
      exact: false
    }
  );
});

test('toggles between selected option', () => {
  render(<Default />);
  const inputs = screen.getAllByRole('radio');
  expect(inputs).toHaveLength(frequencyOptions.length);
  inputs.forEach((input) => {
    fireEvent.click(input);
    expect(input).toBeChecked();
    const uncheckedCount = screen.getAllByRole('radio', { checked: false }).length;
    expect(uncheckedCount + 1).toBe(inputs.length);
  });
});
