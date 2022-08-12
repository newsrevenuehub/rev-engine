import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './Frequency.stories';
import Frequency from './Frequency';

const { Default } = composeStories(stories);

test('is required by default', () => {
  render(<Default />);
  Frequency.defaultProps.options.forEach(({ labelText }) => {
    const input = screen.getByLabelText(labelText);
    expect(input.required).toBe(true);
  });
});

test('has default checked index', () => {
  render(<Default />);
  const inputs = screen.getByRole('radio');
  expect(inputs).toHaveLength(Frequency.defaultProps.options.length);
  expect(inputs.filter((input) => input.checked)).toHaveLength(1);
  expect(inputs.findIndex((input) => input.checked)).toBe(Frequency.defaultProps.defaultCheckedIndex);
});

// test('toggles between selected option', () => {
// 	render(<Default />);

// })
