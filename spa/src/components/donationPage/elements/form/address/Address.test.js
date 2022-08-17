import { fireEvent, render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/testing-react';

import * as stories from './Address.stories';
import Address from './Address';

const { Default } = composeStories(stories);

test('default behavior', () => {
  const expectations = [
    {
      labelText: Address.defaultProps.streetAddressLabelText,
      required: Address.defaultProps.streetAddressRequired
    },
    {
      labelText: Address.defaultProps.cityLabelText,
      required: Address.defaultProps.cityRequired
    },
    {
      labelText: Address.defaultProps.stateLabelText,
      required: Address.defaultProps.stateRequired
    },
    {
      labelText: Address.defaultProps.zipLabelText,
      required: Address.defaultProps.zipRequired
    },
    {
      labelText: Address.defaultProps.countryLabelText,
      required: Address.defaultProps.countryRequired
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
