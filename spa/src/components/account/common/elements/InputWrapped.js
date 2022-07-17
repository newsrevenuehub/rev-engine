import { useState } from 'react';

import * as S from './InputWrapped.styled';
import PropTypes from 'prop-types';

import InputAccount from 'components/account/common/elements/InputAccount';
import Input from 'elements/inputs/Input';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

function InputWrapped({ value, onChange, type, label, disabled, instructions, errorMessage }) {
  const [updated, setUpdated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordDisplay = () => {
    setShowPassword(showPassword ? false : true);
  };

  let inpType = Input.types.PASSWORD && showPassword ? Input.types.TEXT : type;

  return (
    <>
      {label && label !== '' && <S.Label>{label}</S.Label>}
      <S.InputWrapped>
        <InputAccount value={value} onChange={onChange} type={inpType} />
        {type === Input.types.PASSWORD && (
          <S.Visibility onClick={togglePasswordDisplay} src={showPassword ? visibilityOn : visibilityOff} />
        )}
      </S.InputWrapped>
      {instructions && instructions !== '' && <S.Instructions>{instructions}</S.Instructions>}
      {errorMessage && errorMessage !== '' ? <S.ErrorMessage>{errorMessage}</S.ErrorMessage> : <S.ErrorSpacer />}
    </>
  );
}

InputWrapped.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  type: PropTypes.oneOf(Object.values(Input.types))
};

export default InputWrapped;
