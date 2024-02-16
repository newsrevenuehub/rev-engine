import styled from 'styled-components';

export const EditControls = styled.div`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    text-align: center;
  }
`;

export const LastCardDigits = styled.span`
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};

  &::before {
    /* Leading dots */
    content: '\\2022\\2022\\2022\\00a0';
  }
`;
