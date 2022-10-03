import styled from 'styled-components';
import {
  Button as MuiButton,
  Paper as MuiPaper,
  Modal as MuiModal,
  IconButton as MuiIconButton
} from '@material-ui/core';

export const Flex = styled.div`
  gap: 12px;
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  margin-right: 30px;
  font-family: ${(props) => props.theme.systemFont};

  svg {
    color: ${(props) => props.theme.colors.muiLightBlue[800]};
  }
`;

export const Content = styled.div`
  gap: 20px;
  display: flex;
  flex-direction: column;
  margin: 14px;
  font-family: ${(props) => props.theme.systemFont};

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    margin: 14px 0 0 0;
  }
`;

export const Actions = styled.div`
  gap: 12px;
  display: flex;
  margin: 14px -14px -14px 0;
  font-family: ${(props) => props.theme.systemFont};
  justify-content: end;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    flex-direction: column;
    margin: 14px 0 0 0;
  }
`;

export const Title = styled.h1`
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  font-weight: 600;
  margin: 0;
`;

export const Modal = styled(MuiModal)`
  && {
    display: flex;
    align-items: center;
    justify-content: center;

    p,
    h1,
    input,
    span {
      font-family: ${(props) => props.theme.systemFont};
    }
  }
`;

export const Paper = styled(MuiPaper)`
  && {
    position: absolute;
    width: 669px;
    border-radius: ${(props) => props.theme.muiBorderRadius.xl};
    padding: 14px;

    @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
      max-width: calc(100% - 32px);
    }
  }
`;

export const Icon = styled.div`
  > svg {
    height: 24px;
    width: 24px;
  }
  color: ${(props) => props.theme.colors.muiGrey[400]};
`;

export const IconButton = styled(MuiIconButton)`
  && {
    position: absolute;
    height: 40px;
    width: 40px;
    right: 6px;
    top: 6px;
  }
`;

export const GoToButton = styled(MuiButton)`
  && {
    min-width: 123px;
    font-weight: 600;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  }
`;

export const ContributionButton = styled(MuiButton)`
  && {
    min-width: 123px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.white};
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
    background-color: ${(props) => props.theme.colors.muiLightBlue[800]};

    :hover {
      background-color: ${(props) => `${props.theme.colors.muiLightBlue[800]}99`};
    }
  }
`;
