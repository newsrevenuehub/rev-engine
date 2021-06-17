import styled from 'styled-components';

export const DElement = styled.fieldset`
  border: none;
  padding: 4rem 0;
  margin: 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${(props) => props.theme.ruleStyle} ${(props) => props.theme.colors.grey[1]};
  }
`;

export const Label = styled.h3`
  font-size: ${(props) => props.theme.fontSizes[2]};
  font-weight: 100;
  letter-spacing: 0.03em;
  color: ${(props) => props.theme.colors.black};
`;

export const Description = styled.p`
  font-size: ${(props) => props.theme.fontSizes[0]};
  font-weight: 500;
  color: ${(props) => props.theme.colors.black};
`;
