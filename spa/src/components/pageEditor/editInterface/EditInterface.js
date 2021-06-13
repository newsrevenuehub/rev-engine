import * as S from './EditInterface.styled';

function EditInterface() {
  return (
    <S.EditInterface initial={{ opacity: 0, x: 200 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 200 }}>
      <p>EditInterface</p>
    </S.EditInterface>
  );
}

export default EditInterface;
