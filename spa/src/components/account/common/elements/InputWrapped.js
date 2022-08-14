import { useState } from 'react';

import * as S from './InputWrapped.styled';
import PropTypes from 'prop-types';

import InputAccount from 'components/account/common/elements/InputAccount';
import Input from 'elements/inputs/Input';

import visibilityOn from 'assets/images/account/visibility_on.png';
import visibilityOff from 'assets/images/account/visibility_off.png';

function InputWrapped({ value, onChange, type, label, instructions, testid, errorMessage }) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordDisplay = () => {
    setShowPassword(showPassword ? false : true);
  };

  let inpType = type === Input.types.PASSWORD && showPassword ? Input.types.TEXT : type;

  return (
    <>
      {label && label !== '' && (
        <S.Label data-testid={`label`} status={{ hasError: errorMessage && errorMessage !== '' ? true : false }}>
          {label}
        </S.Label>
      )}
      <S.InputWrapped status={{ hasError: errorMessage && errorMessage !== '' ? true : false }}>
        <InputAccount
          testid={testid}
          data-testid={`inp-${inpType}${testid ? testid : ''}`}
          value={value}
          onChange={onChange}
          type={inpType}
        />
        {type === Input.types.PASSWORD && (
          <S.Visibility
            data-testid="toggle"
            onClick={togglePasswordDisplay}
            src={showPassword ? visibilityOn : visibilityOff}
          />
        )}
      </S.InputWrapped>
      {instructions && <S.Instructions data-testid={`instructions`}>{instructions}</S.Instructions>}
      {errorMessage ? <S.ErrorMessage data-testid={`error`}>{errorMessage}</S.ErrorMessage> : <S.ErrorSpacer />}
    </>
  );
}

InputWrapped.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  type: PropTypes.oneOf(Object.values(Input.types)),
  label: PropTypes.string,
  instructions: PropTypes.string,
  testid: PropTypes.string,
  errorMessage: PropTypes.string
};

export default InputWrapped;
