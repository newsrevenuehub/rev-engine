import styled from 'styled-components';

export const Root = styled.div`
  background-color: ${({ theme }) => theme.basePalette.primary.indigo};
  /*
  This color is a one-off--original designs used an indigo shade, but started
  the gradient outside the page to make it more subtle. This is a sample of what
  the color was in the designs at the top-right corner of the page.
  */
  background-image: radial-gradient(100vh circle at top right, #483b4e, transparent);
  display: grid;
  align-content: center;
  justify-content: center;
  min-height: 100vh;
`;

export const Box = styled.div`
  background: ${({ theme }) => theme.basePalette.greyscale.white};
  border: 0.5px solid ${({ theme }) => theme.basePalette.greyscale['30']};
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.2);
  border-radius: ${({ theme }) => theme.muiBorderRadius.xl};
  max-width: 700px;
  padding: 30px 60px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 0px 0px;
  }
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    padding: 30px;
  }
`;

export const Footer = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  margin-top: 24px;
`;

export const Heading = styled.h1`
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg3x};
  font-weight: 700;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  }
`;

export const Icons = styled.div`
  display: flex;
  gap: 20px;

  & svg {
    background-color: ${({ theme }) => theme.basePalette.primary.chartreuse};
    border-radius: 33px;
    height: 66px;
    padding: 15px;
    width: 66px;
  }
`;

export const Logo = styled.img`
  left: 55px;
  position: absolute;
  top: 45px;
  width: 200px;
`;

export const MainText = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
`;

export const Message = styled.p<{ $isSuccess?: boolean }>`
  margin-top: 10px;
  background: ${(props) => (props.$isSuccess ? props.theme.colors.status.done : props.theme.colors.error.bg)};
  border-radius: ${(props) => props.theme.muiBorderRadius.sm};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  line-height: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  padding: 0px 9px;
`;

export const SmallerText = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;

export const Subheading = styled.h2`
  font-family: ${({ theme }) => theme.systemFont};
  font-size: ${({ theme }) => theme.fontSizesUpdated[20]};
  font-weight: 500;
`;
