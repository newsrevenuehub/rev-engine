import styled from 'styled-components';

export const EditControls = styled.div`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    text-align: center;
  }
`;

/**
 * This forces credit card and expiration onto a new row in > tablet viewports,
 * but disappears when the columns are stacked in mobile/table viewports.
 */
export const EmptyColumn = styled.div`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const LastCardDigits = styled.span`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};

  &::before {
    /* Leading dots */
    content: '\\2022\\2022\\2022\\00a0';
  }
`;
