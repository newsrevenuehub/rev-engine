import styled from 'styled-components';

export const Controls = styled.div`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Header = styled.div`
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale['30']};
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 5px;
`;

export const MobileControls = styled.div`
  display: none;
  padding: 20px 0 6px 0;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: block;
  }
`;

export const Root = styled.div<{ $disabled?: boolean; $highlighted: boolean }>`
  ${(props) => props.$disabled && 'opacity: 0.5'};
  ${(props) => props.$highlighted && `background-color: #f9f9f9`};

  /* Padding must be here so that there's padding around the highlight. */
  padding: 14px 40px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 14px 20px;
  }
`;

export const Title = styled.h4`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 600;
  margin: 0 0 5px 0;
`;

export const EditControls = styled.div`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    text-align: center;
  }
`;
