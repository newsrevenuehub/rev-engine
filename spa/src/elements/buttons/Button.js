import * as S from './Button.styled';

import Spinner from 'elements/Spinner';

function Button({ children, loading, ...props }) {
  return <S.Button {...props}>{loading ? <Spinner /> : children}</S.Button>;
}

export default Button;
