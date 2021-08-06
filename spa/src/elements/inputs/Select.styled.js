import styled, { css } from 'styled-components';
import { baseInputStyles } from 'elements/inputs/BaseField.styled';

export const SelectWrapper = styled.div`
  position: relative;
`;

export const Select = styled.button`
  position: relative;
  text-align: left;
  padding: 0;
  margin: 0;
  border: none;
  width: 100%;
  ${baseInputStyles};
`;

export const List = styled.ul`
  position: absolute;
  padding: 0;
  margin: 0;

  ${(props) => {
    if (props.dropdownPosition === 'above')
      return css`
        bottom: 100%;
      `;
    else
      return css`
        top: 100%;
      `;
  }}
  min-width: 100%;
  z-index: 2;
  list-style: none;
  background: ${(props) => props.theme.colors.inputBackground};
  box-shadow: ${(props) => props.theme.shadows[1]};
  border-radius: ${(props) => props.theme.radii[0]};
  border: 1px solid;
  border-color: ${(props) => props.theme.colors.grey[0]};

  overflow-y: scroll;
`;

export const Item = styled.li`
  padding: 1rem 1.5rem;
  background: ${(props) => (props.highlighted ? props.theme.colors.grey[0] : 'transparent')};
`;
