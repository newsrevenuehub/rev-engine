import { useState } from 'react';
import { StandardTextFieldProps } from '@material-ui/core';
import { VisibilityOffOutlined, VisibilityOutlined } from '@material-ui/icons';
import { Button } from 'components/base';
import { Root } from './PasswordField.styled';

// We have to extend a particular kind of props, not just TextFieldProps,
// because TypeScript won't allow it [ts(2312) is the error message]. Extending
// standard because that's the variant we use in our TextField.

export interface PasswordFieldProps extends Omit<StandardTextFieldProps, 'type'> {
  /**
   * The `type` attribute to use when the field is visible. Defaults to `text`.
   */
  visibleFieldType?: string;
}

/**
 * A password field with a button at its end to allow toggling the visibility of
 * its value. The visibility state is uncontrolled.
 */
export function PasswordField({ visibleFieldType = 'text', ...other }: PasswordFieldProps) {
  const [fieldType, setFieldType] = useState<string>('password');

  return (
    <Root
      {...other}
      InputProps={{
        // Have to copy props from our base component to get styling to look correct.
        classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
        endAdornment: (
          <Button
            onClick={() => setFieldType((type) => (type === 'password' ? visibleFieldType : 'password'))}
            aria-label={fieldType === 'password' ? 'Show Password' : 'Hide Password'}
            color="text"
          >
            {fieldType === 'password' ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
          </Button>
        )
      }}
      type={fieldType}
    />
  );
}

export default PasswordField;
