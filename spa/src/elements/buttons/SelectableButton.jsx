import * as S from './SelectableButton.styled';

function SelectableButton({ children, selected, onClick, ...props }) {
  return (
    <S.SelectableButton selected={selected} onClick={onClick} {...props}>
      {children}
    </S.SelectableButton>
  );
}

export default SelectableButton;
