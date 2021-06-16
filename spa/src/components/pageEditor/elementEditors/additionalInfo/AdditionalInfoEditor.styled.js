import styled from 'styled-components';

import { baseInputStyles } from 'elements/inputs/BaseField.styled';
import RevEnginePlusButton from 'elements/buttons/PlusButton';
import RevEngineXButton from 'elements/buttons/XButton';

export const AdditionalInfoEditor = styled.div`
  margin-left: 6rem;
  margin-right: 3rem;
`;

export const Description = styled.p``;

export const CurrentInputs = styled.ul`
  margin: 0;
  padding: 0;
`;

export const CurrentInput = styled.li`
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin: 2rem 0;

  background: ${(props) => props.theme.colors.fieldBackground};
  border-radius: ${(props) => props.theme.radii[1]};
  padding: 1rem;
`;

export const RemoveIconWrapper = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
`;

export const CurrentKey = styled.span`
  margin-right: 1.5rem;
  font-weight: bold;
`;

export const CurrentLabel = styled.span`
  font-weight: 200;
  width: 65%;
`;

export const InputInputs = styled.div`
  padding: 0;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  background: ${(props) => props.theme.colors.fieldBackground};
  border-radius: ${(props) => props.theme.radii[1]};
  padding: 1rem;
  margin: 2rem 0;
`;

export const KeyWrapper = styled.div`
  width: 100px;
  margin-right: 1.5rem;
`;

export const LabelWrapper = styled.div`
  flex: 1;
`;

export const InputLabel = styled.label`
  font-weight: bold;
`;

export const InputInput = styled.input`
  ${baseInputStyles};
  padding: 0.5rem;
  height: auto;
  width: 100%;
  font-size: 14px;
  border-color: ${(props) => props.theme.colors.grey[0]};
`;

export const PlusButton = styled(RevEnginePlusButton)`
  margin-bottom: 6px;
`;

export const XButton = styled(RevEngineXButton)``;

export const Error = styled.p`
  color: ${(props) => props.theme.colors.caution};
`;
