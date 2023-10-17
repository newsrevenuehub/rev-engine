import styled from 'styled-components';
import lighten from 'styles/utils/lighten';
import darken from 'styles/utils/darken';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 12px;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Content = styled.div`
  display: flex;
  gap: 30px;
`;

export const Button = styled.button`
  height: 35px;
  width: 120px;
  padding: 0;
  font-weight: 500;
  color: ${(props) => props.theme.colors.muiGrey[600]};
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  border-radius: ${(props) => props.theme.muiBorderRadius['2xl']};
  border: 1px solid ${(props) => props.theme.colors.muiGrey[50]};
  box-shadow:
    0px 0.3px 0.5px rgba(0, 0, 0, 0.1),
    0px 2px 4px rgba(0, 0, 0, 0.2);
  background-color: ${(props) => props.theme.colors.white};
  cursor: pointer;
  text-transform: capitalize;

  &:hover {
    background-color: ${(props) => darken(props.theme.colors.white, 5)};
    border: 1px solid ${(props) => darken(props.theme.colors.white, 5)};
  }

  ${(props) =>
    props.selected &&
    `
    color: ${props.theme.colors.white};
    background-color: ${props.theme.colors.muiGrey[600]};
    border: none;
    font-weight: 600;

    &:hover {
      background-color: ${lighten(props.theme.colors.muiGrey[600], 9)};
      border: none;
    }
  `}
`;

export const Label = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 500;
  margin: 0;
`;
