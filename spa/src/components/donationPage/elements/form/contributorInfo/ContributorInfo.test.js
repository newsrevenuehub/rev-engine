import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './ContributorInfo.stories';
import { defaultArgs } from './ContributorInfo';
import { MESSAGE } from './validator';

const { Default } = composeStories(stories);

test('default required inputs can be located and typed in', () => {
  const expectations = [
    {
      labelText: defaultArgs.firstNameLabelText,
      required: defaultArgs.firstNameRequired
    },
    {
      labelText: defaultArgs.lastNameLabelText,
      required: defaultArgs.lastNameRequired
    },
    {
      labelText: defaultArgs.emailLabelText,
      required: defaultArgs.emailRequired
    }
  ];
  render(<Default />);
  expectations.forEach((expectation) => {
    const input = screen.getByLabelText(expectation.labelText);
    expect(input).toBeInTheDocument();
    expect(input.required).toBe(expectation.required);
    expect(input.value).toBe('');
    const inputText = 'user typed something';
    fireEvent.change(input, { target: { value: inputText } });
    expect(input.value).toBe(inputText);
  });
});

test('email input validates for email', async () => {
  render(<Default />);
  const invalid = 'user typed something';
  const input = screen.getByLabelText(defaultArgs.emailLabelText);
  fireEvent.change(input, { target: { value: invalid } });
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(MESSAGE);
  const valid = 'foo@bar.com';
  fireEvent.change(input, { target: { value: valid } });
  fireEvent.click(button);
  await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
});
