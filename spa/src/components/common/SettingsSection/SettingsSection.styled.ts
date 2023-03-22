import styled from 'styled-components';

export const Flex = styled.div<{ $hideBottomDivider: boolean }>`
  display: flex;
  gap: 40px;

  ${(props) =>
    !props.$hideBottomDivider &&
    `
    padding-bottom: 26px;
    border-bottom: 1px solid ${props.theme.colors.muiGrey[100]};
  `}

  h2,
  p {
    font-family: ${(props) => props.theme.systemFont};
  }

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    flex-direction: column;
  }
`;

export const H3 = styled.h3`
  font-size: ${(props) => props.theme.fontSizesUpdated[20]};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-weight: 500;
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  margin: 0;
`;

export const Left = styled.div`
  display: flex;
  flex-direction: column;
  width: 400px;
  gap: 6px;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    width: unset;
  }
`;

export const Right = styled.div`
  width: 440px;
  gap: 6px;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    width: unset;
  }
`;
