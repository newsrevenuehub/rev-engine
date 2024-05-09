import { ButtonBase, StandardTextFieldProps } from '@material-ui/core';
import Mailcheck from 'mailcheck';
import { useEffect, useState } from 'react';
import TextField from './TextField';
import Link from '../Link/Link';

// We can't extend TextFieldProps directly because it's generic. We use
// StandardTextFieldProps here because that's the type we use in TextField.

export interface EmailTextFieldProps extends StandardTextFieldProps {
  onAcceptSuggestedValue: (value: string) => void;
}

/**
 * This works similarly to a TextField, but it defaults to type `email` (for
 * improved validation) and will also show `helperText` offering to correct
 * misspellings of common domains. Both these props can be overridden by
 * consumers. If a suggestion is taken by the user, this generates a synthentic
 * `onChange` call with the new value.
 *
 * This must be used in a controlled fashion, e.g. with `value` and `onChange`
 * props.
 */
export function EmailTextField({ onAcceptSuggestedValue, ...props }: EmailTextFieldProps) {
  const [suggestedValue, setSuggestedValue] = useState<string>();

  useEffect(() => {
    if (typeof props.value === 'string' && props.value.trim() !== '') {
      Mailcheck.run({
        email: props.value,
        empty: () => setSuggestedValue(undefined),
        suggested: ({ full }: MailcheckModule.ISuggestion) => setSuggestedValue(full)
      });
    }
  }, [props.value]);

  return (
    <TextField
      helperText={
        suggestedValue && (
          <>
            Did you mean{' '}
            <ButtonBase component={Link} onClick={() => onAcceptSuggestedValue(suggestedValue)}>
              {suggestedValue}
            </ButtonBase>
            ?
          </>
        )
      }
      type="email"
      {...props}
    />
  );
}

export default EmailTextField;
