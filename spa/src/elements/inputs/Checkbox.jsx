import * as S from './Checkbox.styled';

function Checkbox({ label, id, ...props }) {
  return (
    <S.CheckBoxField>
      <S.Checkbox id={id} {...props} />
      {label && <S.CheckboxLabel htmlFor={id}>{label}</S.CheckboxLabel>}
    </S.CheckBoxField>
  );
}

export default Checkbox;
