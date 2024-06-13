import PropTypes, { InferProps } from 'prop-types';
import { Controller, useForm } from 'react-hook-form';
import { Button, Checkbox, FormControlLabel, Link } from 'components/base';
import PasswordField from 'components/common/TextField/PasswordField/PasswordField';
import { PRIVACY_POLICY_URL, TS_AND_CS_URL } from 'constants/helperUrls';
import { AgreedError, EmailField, Root } from './SignUpForm.styled';

const SignUpFormPropTypes = {
  disabled: PropTypes.bool,
  errorMessage: PropTypes.shape({
    password: PropTypes.node,
    email: PropTypes.node
  }),
  onSubmit: PropTypes.func
};

export interface SignUpFormProps extends InferProps<typeof SignUpFormPropTypes> {
  onSubmit: (email: string, password: string) => void;
}

export function SignUpForm({ disabled, errorMessage, onSubmit }: SignUpFormProps) {
  const {
    control,
    formState: { errors },
    handleSubmit
  } = useForm({
    defaultValues: {
      agreed: false,
      email: '',
      password: ''
    }
  });

  return (
    <Root noValidate onSubmit={handleSubmit(({ email, password }) => onSubmit(email, password))}>
      <Controller
        control={control}
        name="email"
        rules={{
          pattern: {
            value: /\S+@\S+\.\S+/,
            message: 'Please enter a valid email address.'
          },
          required: 'Please enter your email address.'
        }}
        render={({ field }) => (
          <EmailField
            error={!!errors.email || !!errorMessage?.email}
            fullWidth
            helperText={errors.email?.message ?? errorMessage?.email}
            id="email"
            label="Email"
            type="email"
            {...field}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        rules={{
          required: 'Please enter a password.',
          minLength: {
            value: 8,
            message: 'Your password must be at least 8 characters long.'
          }
        }}
        render={({ field }) => {
          const { ref, ...other } = field;

          return (
            <PasswordField
              error={!!errors.password || !!errorMessage?.password}
              fullWidth
              helperText={
                errors.password?.message ?? errorMessage?.password ?? 'Password must be at least 8 characters long.'
              }
              id="password"
              inputRef={ref}
              label="Password"
              {...other}
            />
          );
        }}
      />
      <Controller
        control={control}
        name="agreed"
        rules={{
          required: 'You must agree to the terms and conditions in order to create an account.'
        }}
        render={({ field }) => (
          <>
            <FormControlLabel
              control={<Checkbox {...field} />}
              label={
                <>
                  I agree to News Revenue Hub's{' '}
                  <Link href={TS_AND_CS_URL} target="_blank">
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href={PRIVACY_POLICY_URL} target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </>
              }
            />
            {errors.agreed && <AgreedError>{errors.agreed.message}</AgreedError>}
          </>
        )}
      />
      <Button disabled={!!disabled} fullWidth type="submit">
        Create Account
      </Button>
    </Root>
  );
}

SignUpForm.propTypes = SignUpFormPropTypes;
export default SignUpForm;
