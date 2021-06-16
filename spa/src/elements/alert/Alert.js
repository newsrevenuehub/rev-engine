import * as S from './Alert.styled';
import { transitions, positions } from 'react-alert';

function Alert({ style, options, message, close }) {
  return (
    <S.Alert style={style} type={options.type} data-testid="alert">
      {message}
      <S.Close onClick={close}>x</S.Close>
    </S.Alert>
  );
}

export default Alert;

export const alertOptions = {
  // you can also just use 'bottom center'
  position: positions.BOTTOM_CENTER,
  timeout: 5000,
  offset: '15px',
  // you can also just use 'scale'
  transition: transitions.SCALE,
  containerStyle: {
    zIndex: 1020
  }
};
