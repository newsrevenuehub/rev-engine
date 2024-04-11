import { CircularProgress } from 'components/base';
import * as S from './Button.styled';

function Button({ children, loading, ...props }) {
  return <S.Button {...props}>{loading ? <CircularProgress /> : children}</S.Button>;
}

export default Button;
