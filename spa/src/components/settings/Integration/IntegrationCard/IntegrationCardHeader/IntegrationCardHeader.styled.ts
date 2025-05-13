import styled from 'styled-components';
import LaunchMui from '@material-ui/icons/Launch';

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
  top: -20px;
  right: 0;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.colors.topbarBackground};
`;

export const Site = styled.a`
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.basePalette.greyscale['70']};
  cursor: pointer;

  &:hover {
    color: ${(props) => props.theme.basePalette.greyscale['70']};
    text-decoration: none;
  }
`;

export const LaunchIcon = styled(LaunchMui)`
  && {
    color: ${(props) => props.theme.basePalette.greyscale['70']};
    margin-left: 5px;
    height: 16px;
    width: 16px;
  }
`;

export const Title = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.basePalette.greyscale.black};
  font-weight: 500;
  margin: 0;
`;

export const TitleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
`;
