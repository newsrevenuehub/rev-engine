import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './Address.stories';
import { defaultArgs } from './Address';

const { Default } = composeStories(stories);

test('default behavior', () => {
  const expectations = [
    {
      labelText: defaultArgs.streetAddressLabelText,
      required: defaultArgs.streetAddressRequired
    },
    {
      labelText: defaultArgs.cityLabelText,
      required: defaultArgs.cityRequired
    },
    {
      labelText: defaultArgs.stateLabelText,
      required: defaultArgs.stateRequired
    },
    {
      labelText: defaultArgs.zipLabelText,
      required: defaultArgs.zipRequired
    },
    {
      labelText: defaultArgs.countryLabelText,
      required: defaultArgs.countryRequired
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

test('Google Maps autocomplete integration', () => {
  // TODO: test this, which will require getting an API key for Google Maps in
  // CI env
});
