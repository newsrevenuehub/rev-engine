import * as S from './ElementLoading.styled';

// Children
import Spinner from 'elements/Spinner';

function ElementLoading(props) {
  return (
    <S.ElementLoading>
      <Spinner />
    </S.ElementLoading>
  );
}

export default ElementLoading;
