import styled from 'styled-components';

export const DElement = styled.li``;

export const Label = styled.h2`
  font-size: ${(props) => props.theme.fontSizes[2]};
  letter-spacing: 0.03em;
  color: ${(props) => props.theme.colors.black};
`;

export const Description = styled.p`
  font-family: ${(props) => props.theme.systemFont};
  font-size: ${(props) => props.theme.fontSizes[1]};
  font-weight: 500;
  color: ${(props) => props.theme.colors.black};
`;
