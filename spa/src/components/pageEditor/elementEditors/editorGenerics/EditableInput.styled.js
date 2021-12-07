import styled from 'styled-components';
import { baseInputStyles } from 'elements/inputs/BaseField.styled';

export const EditableInput = styled.div``;

export const Name = styled.p``;

export const Description = styled.p``;

export const EditableLabel = styled.label``;

export const PretendInput = styled.div`
  ${baseInputStyles};
  display: flex;
  align-items: center;
`;

export const EditablePlaceholder = styled.p`
  opacity: 0.75;
`;

export const Editable = styled.div`
  position: relative;
`;

export const InnerInput = styled.input`
  position: absolute;
`;
