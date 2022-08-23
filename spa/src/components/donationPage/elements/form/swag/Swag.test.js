import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';
import userEvent from '@testing-library/user-event';

import * as stories from './Swag.stories';

const { Default, ThresholdNotMet, OptOutDefaultChecked } = composeStories(stories);

test('default behavior', async () => {
  const user = userEvent.setup();
  render(<Default />);

  screen.getByText(Default.args.headerText);
  screen.getByText(`Give a total of ${Default.args.swagThreshold} per year to be eligible`);
  screen.getByText('Your contribution comes with member merchandise. Please choose an option');

  const optOutCheckbox = screen.getByLabelText(Default.args.optOutLabelText);
  expect(optOutCheckbox.checked).toBe(false);
  const swagSelect = screen.getByLabelText(Default.args.swagItemLabelText);
  await user.selectOptions(swagSelect, Default.args.swagItemOptions[0].labelText);

  const button = screen.getByRole('button', { name: 'Submit' });
  user.click(button);
  await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
  await screen.findByText(
    JSON.stringify({
      [Default.args.optOutName]: false,
      [Default.args.swagItemName]: Default.args.swagItemOptions[0].value
    }),
    { exact: false }
  );
});

test('opt-out of swag is pre-checked', () => {
  render(<OptOutDefaultChecked />);
  const optOutCheckbox = screen.getByLabelText(Default.args.optOutLabelText);
  expect(optOutCheckbox.checked).toBe(true);
  expect(screen.queryByLabelText(Default.args.swagItemLabelText)).not.toBeInTheDocument();
  fireEvent.click(optOutCheckbox);
  expect(screen.getByLabelText(Default.args.swagItemLabelText)).toBeInTheDocument();
});

test('giving threshold is not met', () => {
  render(<ThresholdNotMet />);
  screen.getByText(Default.args.headerText);
  screen.getByText(`Give a total of ${Default.args.swagThreshold} per year to be eligible`);

  expect(
    screen.queryByText('Your contribution comes with member merchandise. Please choose an option')
  ).not.toBeInTheDocument();

  expect(screen.queryByLabelText(Default.args.optOutLabelText)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(Default.args.swagItemLabelText)).not.toBeInTheDocument();
});
