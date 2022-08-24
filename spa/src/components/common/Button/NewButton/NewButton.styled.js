import styled from 'styled-components';
import lighten from 'styles/utils/lighten';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Button = styled.button`
  background-color: ${(props) => props.theme.colors.muiLightBlue[800]};
  padding: ${(props) => (props.type === 'page' ? '3rem' : '1.25rem')} 4.5rem;
  font-size: ${(props) => props.theme.fontSizesUpdated.h1};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  font-weight: 600;

  &:hover {
    background-color: ${(props) => lighten(props.theme.colors.muiLightBlue[800], 2)};
  }

  &:active {
    background-color: ${(props) => props.theme.colors.muiLightBlue[500]};
  }
`;

export const Label = styled.label`
  margin-top: 0.75rem;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  font-weight: 600;

  ${Flex}:active & {
    color: ${(props) => props.theme.colors.muiLightBlue[500]};
  }
`;
