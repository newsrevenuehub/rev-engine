import { useState } from 'react';
import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';

import useModal from 'hooks/useModal';

import * as S from '../Account.styled';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';
import Checkbox from '@material-ui/core/Checkbox';
import { Tooltip } from 'components/base';

function AcceptTerms({ checked, handleTOSChange }) {
  const termsLink = 'https://fundjournalism.org/faq/terms-of-service/';
  const policyLink = 'https://fundjournalism.org/faq/privacy-policy/';
  return (
    <S.AcceptTerms>
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
      <S.AcceptTermsText>
        I agree to News Revenue Hub’s{' '}
        <a href={termsLink} rel="noreferrer" target="_blank">
          Terms & Conditions
        </a>{' '}
        and{' '}
        <a href={policyLink} rel="noreferrer" target="_blank">
          Privacy Policy
        </a>
        .
      </S.AcceptTermsText>
    </S.AcceptTerms>
  );
}

function SignUpForm({ onSubmitSignUp, loading }) {
  const [checked, setChecked] = useState(false);
  const { open: showPassword, handleToggle: togglePasswordVisiblity } = useModal();

  const handleTOSChange = (event) => {
    setChecked(event.target.checked);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const watchEmail = watch('email', '');
  const watchPassword = watch('password', '');
  const disabled = !watchEmail || !watchPassword || loading || !checked;

  return (
    <form onSubmit={disabled ? () => {} : handleSubmit(onSubmitSignUp)}>
      <S.InputLabel hasError={errors.email}>Email</S.InputLabel>
      <S.InputOuter hasError={errors.email}>
        <input
          id="email"
          name="email"
          {...register('email', {
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Please enter a valid email'
            }
          })}
          type="text"
          status={errors.email}
          data-testid="signup-email"
        />
      </S.InputOuter>
      {errors.email ? (
        <S.Message role="error" data-testid="email-error">
          {errors.email.message}
        </S.Message>
      ) : (
        <S.MessageSpacer />
      )}

      <S.InputLabel hasError={errors.password}>Password</S.InputLabel>
      <S.InputOuter hasError={errors.password}>
        <input
          id="password"
          name="password"
          {...register('password', {
            required: 'Please enter your password',
            validate: (val) => {
              if (val.length < 8 || !/[a-zA-Z]/.test(val)) {
                return 'Password should be alphanumeric and at least 8 characters long';
              }
            }
          })}
          type={showPassword ? 'text' : 'password'}
          status={errors.password}
          data-testid="signup-pwd"
        />
        <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
          <S.Visibility
            data-testid="toggle-password"
            onClick={togglePasswordVisiblity}
            src={showPassword ? visibilityOn : visibilityOff}
            visible={showPassword ? 'true' : ''}
          />
        </Tooltip>
      </S.InputOuter>
      {errors.password ? (
        <S.Message role="error">{errors.password.message}</S.Message>
      ) : (
        <S.Message info="true">Password must be 8 characters long and alphanumerical.</S.Message>
      )}
      <AcceptTerms checked={checked} handleTOSChange={handleTOSChange} />
      <S.Submit type="submit" disabled={disabled} name="Create Account">
        Create Account
      </S.Submit>
    </form>
  );
}

SignUpForm.propTypes = {
  onSubmitSignUp: PropTypes.func,
  loading: PropTypes.bool
};

export default SignUpForm;
