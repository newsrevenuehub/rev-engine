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

export const Group = styled.div`
  align-items: center;
  display: flex;
  gap: 16px;
`;

export const Root = styled.div`
  align-items: center;
  background-color: ${(props) => props.theme.colors.topbarBackground};
  box-shadow: ${(props) => props.theme.shadows[0]};
  display: flex;
  flex-direction: row;
  height: 48px;
  justify-content: space-between;
  left: 0;
  padding: 0px 24px 0px 25px;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: ${(props) => props.theme.zIndex.header};
`;

export const SvgLogo = styled.img`
  height: 29px;
  border-right: 1px solid ${({ theme }) => theme.basePalette.greyscale.grey4};
  padding-right: 16px;
`;
