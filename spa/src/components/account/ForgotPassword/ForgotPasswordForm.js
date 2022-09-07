import { useForm } from 'react-hook-form';

import * as S from '../Account.styled';

function ForgotPasswordForm({ onForgotPasswordSubmit, loading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const onSubmit = async (fdata) => {
    await onForgotPasswordSubmit(fdata);
  };

  const watchEmail = watch('email', '');
  const disabled = loading || watchEmail === '';

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <S.InputLabel hasError={errors.email}>Email</S.InputLabel>
      <S.InputOuter hasError={errors.email}>
        <input
          id="email"
          {...register('email', {
            required: 'Please enter a valid email id',
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Please enter a valid email id'
            }
          })}
          type="text"
          status={errors.email}
          data-testid="forgotpwd-email"
        />
      </S.InputOuter>
      {errors.email ? <S.Message role="error">{errors.email.message}</S.Message> : <S.MessageSpacer />}

      <S.Submit type="submit" disabled={disabled} data-testid="forgotpwd-submit">
        Send Reset Link
      </S.Submit>
    </form>
  );
}

export default ForgotPasswordForm;
