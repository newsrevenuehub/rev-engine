import { render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './InputError.stories';

const { Default, NoMessage } = composeStories(stories);

test('when error message', () => {
  render(<Default />);
  const alert = screen.getByRole('alert');
  expect(alert).toBeInTheDocument();
  expect(alert).toHaveTextContent(Default.args.message);
});

test('when amountFrequency provided', () => {
  render(<NoMessage />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
