import styled from 'styled-components';

export const Flex = styled.div<{ $hideBottomDivider: boolean }>`
  display: flex;
  align-items: center;

  ${(props) =>
    !props.$hideBottomDivider &&
    `
    padding-bottom: 14px;
    border-bottom: 1px solid ${props.theme.colors.muiGrey[100]};
  `}

  h2,
  p {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const H2 = styled.h2`
  font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-weight: 500;
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  margin: 0 0 0 10px;
  padding-left: 10px;
  border-left: 1px solid ${(props) => props.theme.colors.muiGrey[300]};
  height: 28px;
  line-height: 28px;
`;
