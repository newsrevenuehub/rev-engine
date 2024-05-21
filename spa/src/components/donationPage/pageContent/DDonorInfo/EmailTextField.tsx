import { StandardTextFieldProps } from '@material-ui/core';
import Mailcheck from 'mailcheck';
import { useState } from 'react';
import { Prompt, PromptButton, TextField } from './EmailTextField.styled';

// These values are derived from past email domains used with the application.
// The goal is to only suggest commonly-used domains.
const SECOND_LEVEL_DOMAINS = ['aol', 'comcast', 'gmail', 'hotmail', 'sbcglobal', 'verizon', 'yahoo'];

// We can't extend TextFieldProps directly because it's generic. We use
// StandardTextFieldProps here because that's the type we use in TextField.

export interface EmailTextFieldProps extends StandardTextFieldProps {
  onAcceptSuggestedValue: (value: string) => void;
}

/**
 * This works similarly to a TextField, but it defaults to type `email` (for
 * improved validation) and will also show `helperText` offering to correct
 * misspellings of common domains when focus moves away from the field. Both
 * these props can be overridden by consumers.
 *
 * This must be used as a controlled component, e.g. with `value` and `onChange`
 * props.
 */
export function EmailTextField({ onAcceptSuggestedValue, ...props }: EmailTextFieldProps) {
  const [suggestedValue, setSuggestedValue] = useState<string>();

  function updateSuggestion() {
    if (typeof props.value === 'string' && props.value.trim() !== '') {
      Mailcheck.run({
        email: props.value,
        empty: () => setSuggestedValue(undefined),
        secondLevelDomains: SECOND_LEVEL_DOMAINS,
        suggested: ({ full }: MailcheckModule.ISuggestion) => setSuggestedValue(full)
      });
    }
  }

  function handleAcceptClick() {
    if (!suggestedValue) {
      // Should never happen.

      throw new Error('Suggested value unset');
    }

    onAcceptSuggestedValue(suggestedValue);
    setSuggestedValue('');
  }

  // We want to allow consumers to override our `helperText` if set, but not
  // remove it by setting it to `undefined`.

  const prunedProps = { ...props };

  if (!prunedProps.helperText) {
    delete prunedProps.helperText;
  }

  return (
    <TextField
      helperText={
        suggestedValue && (
          <Prompt>
            <span>
              Did you mean <strong>{suggestedValue}</strong>?
            </span>
            <span>
              <PromptButton onClick={handleAcceptClick}>Yes</PromptButton>
              <PromptButton onClick={() => setSuggestedValue('')}>No</PromptButton>
            </span>
          </Prompt>
        )
      }
      onBlur={updateSuggestion}
      type="email"
      {...prunedProps}
    />
  );
}

export default EmailTextField;
