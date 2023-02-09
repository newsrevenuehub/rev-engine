import { IconButton } from '@material-ui/core';
import styled from 'styled-components';

export const BackIconButton = styled(IconButton)`
  && {
    height: 22px;
    width: 32px;
    padding: 0;
    fill: ${(props) => props.theme.colors.white};
    &:hover {
      transform: translate(-2px, 0px) scale(1.1);
    }
  }
`;

export const Logo = styled.img`
  margin-top: 8px;
  height: 29px;
  padding-left: 26px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    height: 29px;
    padding-left: 8px;
  }
`;

export const Root = styled.div`
  width: 100%;
  height: 48px;
  left: 0;
  background: ${(props) => props.theme.colors.topbarBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  flex-direction: row;
  position: fixed;
  top: 0;
  z-index: ${(props) => props.theme.zIndex.header};
`;

export const SvgLogo = styled.img`
  height: 29px;
`;

export const Title = styled.span`
  padding-left: 24px;
  margin-right: auto;
  border-left: 1px solid ${(props) => props.theme.colors.muiGrey[50]};
  color: ${(props) => props.theme.colors.white};
  font-family: ${(props) => props.theme.systemFont};
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  line-height: 29px;
`;

export const TopMenu = styled.div`
  flex: 1;
  padding: 0px 20px 0px 25px;
  margin-right: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: end;
`;
