import PropTypes, { InferProps } from 'prop-types';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import useModal from 'hooks/useModal';

import Checkbox from '@material-ui/core/Checkbox';
import visibilityOff from 'assets/images/account/visibility_off.png';
import visibilityOn from 'assets/images/account/visibility_on.png';
import { Tooltip } from 'components/base';
import {
  AcceptTermsText,
  AcceptTermsWrapper,
  InputLabel,
  InputOuter,
  Message,
  MessageSpacer,
  Submit,
  Visibility
} from '../Account.styled';

export const termsLink = 'https://fundjournalism.org/faq/terms-of-service/';
export const policyLink = 'https://fundjournalism.org/faq/privacy-policy/';

export type SignUpFormValues = {
  email: string;
  password: string;
};

export interface SignUpFormProps extends InferProps<typeof SignUpFormPropTypes> {
  onSubmitSignUp: (fdata: SignUpFormValues) => void;
}

type AcceptTermsProps = {
  checked: boolean;
  handleTOSChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function AcceptTerms({ checked, handleTOSChange }: AcceptTermsProps) {
  return (
    <AcceptTermsWrapper>
      <Checkbox
        checked={checked}
        onChange={handleTOSChange}
        data-testid={`acceptTermsCheckbox`}
        size="small"
        style={{
          color: '#302436',
          padding: 0
        }}
      />
      <AcceptTermsText>
        I agree to News Revenue Hub’s{' '}
        <a href={termsLink} rel="noreferrer" target="_blank">
          Terms & Conditions
        </a>{' '}
        and{' '}
        <a href={policyLink} rel="noreferrer" target="_blank">
          Privacy Policy
        </a>
        .
      </AcceptTermsText>
    </AcceptTermsWrapper>
  );
}

function SignUpForm({ onSubmitSignUp, loading, errorMessage }: SignUpFormProps) {
  const [checked, setChecked] = useState(false);
  const { open: showPassword, handleToggle: togglePasswordVisiblity } = useModal();

  const handleTOSChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<SignUpFormValues>();

  const watchEmail = watch('email', '');
  const watchPassword = watch('password', '');
  const disabled = !watchEmail || !watchPassword || loading || !checked;

  const renderEmailError = useMemo(() => {
    if (errors.email) {
      return (
        <Message role="error" data-testid="email-error">
          {errors.email.message}
        </Message>
      );
    }

    if (errorMessage?.email) return errorMessage.email;

    return <MessageSpacer />;
  }, [errorMessage, errors.email]);

  return (
    <form onSubmit={disabled ? undefined : handleSubmit(onSubmitSignUp)}>
      <InputLabel hasError={!!(errors.email || errorMessage?.email)}>Email</InputLabel>
      <InputOuter hasError={!!(errors.email || errorMessage?.email)}>
        <input
          id="email"
          {...register('email', {
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Please enter a valid email'
            }
          })}
          type="text"
          data-testid="signup-email"
        />
      </InputOuter>
      {renderEmailError}

      <InputLabel hasError={!!(errors.password || errorMessage?.password)}>Password</InputLabel>
      <InputOuter hasError={!!(errors.password || errorMessage?.password)}>
        <input
          id="password"
          {...register('password', {
            required: 'Please enter your password',
            validate: (val) => {
              if (val.length < 8 || !/[a-zA-Z]/.test(val)) {
                return 'Password should be alphanumeric and at least 8 characters long';
              }
            }
          })}
          type={showPassword ? 'text' : 'password'}
          data-testid="signup-pwd"
        />
        <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
          <Visibility
            data-testid="toggle-password"
            onClick={togglePasswordVisiblity}
            src={showPassword ? visibilityOn : visibilityOff}
            visible={showPassword ? 'true' : ''}
          />
        </Tooltip>
      </InputOuter>
      {errors.password || errorMessage?.password ? (
        <Message role="error">{errors?.password?.message || errorMessage?.password}</Message>
      ) : (
        <Message info="true">Password must be 8 characters long and alphanumerical.</Message>
      )}
      <AcceptTerms checked={checked} handleTOSChange={handleTOSChange} />
      <Submit type="submit" disabled={disabled} name="Create Account" size="extraLarge">
        Create Account
      </Submit>
    </form>
  );
}

const SignUpFormPropTypes = {
  onSubmitSignUp: PropTypes.func,
  loading: PropTypes.bool,
  errorMessage: PropTypes.shape({
    password: PropTypes.node,
    email: PropTypes.node
  })
};

SignUpForm.propTypes = SignUpFormPropTypes;

export default SignUpForm;
