import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './ContributorInfo.stories';
import { MESSAGE } from './validator';
import ContributorInfo from './ContributorInfo';

const { Default } = composeStories(stories);

test('default required inputs can be located and typed in', () => {
  const expectations = [
    {
      labelText: ContributorInfo.defaultProps.firstNameLabelText,
      required: ContributorInfo.defaultProps.firstNameRequired
    },
    {
      labelText: ContributorInfo.defaultProps.lastNameLabelText,
      required: ContributorInfo.defaultProps.lastNameRequired
    },
    {
      labelText: ContributorInfo.defaultProps.emailLabelText,
      required: ContributorInfo.defaultProps.emailRequired
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
  const input = screen.getByLabelText(ContributorInfo.defaultProps.emailLabelText);
  fireEvent.change(input, { target: { value: invalid } });
  const button = screen.getByRole('button', { name: 'Submit' });
  fireEvent.click(button);
  await screen.findByText(MESSAGE);
  const valid = 'foo@bar.com';
  fireEvent.change(input, { target: { value: valid } });
  fireEvent.click(button);
  await screen.findByText(Default.args.submitSuccessMessage, { exact: false });
});
