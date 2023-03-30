import styled from 'styled-components';
import LaunchMui from '@material-ui/icons/Launch';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 236px;
  padding: 10px;
  border: 0.5px solid ${(props) => props.theme.colors.muiGrey[400]};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};

  h2,
  p {
    font-family: ${(props) => props.theme.systemFont};
  }

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    flex-direction: column;
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
`;

export const Image = styled.img`
  height: 55px;
  width: 55px;
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};
`;

export const Required = styled.p`
  margin: 0;
  position: absolute;
  font-weight: 500;
  top: 0;
  right: 0;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.colors.error.primary};
`;

export const CornerMessage = styled.div`
  margin: 0;
  position: absolute;
  font-weight: 500;
  top: 0;
  right: 0;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.colors.topbarBackground};
`;

export const Content = styled.div`
  flex-grow: 1;
  margin-top: 15px;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

export const Site = styled.a`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  cursor: pointer;

  &:hover {
    color: ${(props) => props.theme.colors.muiGrey[600]};
    text-decoration: none;
  }
`;

export const LaunchIcon = styled(LaunchMui)`
  && {
    color: ${(props) => props.theme.colors.muiGrey[600]};
    margin-left: 5px;
    height: 16px;
    width: 16px;
  }
`;

export const Description = styled.p`
  margin: 0;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-weight: 400;
`;

export const Footer = styled.div<{ $active: boolean }>`
  display: flex;
  padding: 10px;
  margin-left: -10px;
  margin-right: -10px;
  margin-bottom: -10px;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  border-top: 0.5px solid ${(props) => props.theme.colors.muiGrey[400]};

  p {
    margin: 0;
    font-size: ${(props) => props.theme.fontSizesUpdated.sm};
    font-weight: 400;
    color: ${(props) => props.theme.colors.muiGrey[600]};
    ${(props) =>
      props.$active &&
      `
      color: ${props.theme.colors.muiTeal[600]};
      `}
  }
`;

export const Title = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.colors.muiGrey[900]};
  font-weight: 500;
  margin: 0;
`;
