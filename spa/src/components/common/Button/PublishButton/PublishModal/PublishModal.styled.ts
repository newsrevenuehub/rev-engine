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
  font-family: ${(props) => props.theme.systemFont};
`;

export const Content = styled.div`
  gap: 12px;
  display: flex;
  flex-direction: column;
  margin: 14px;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Actions = styled.div`
  gap: 12px;
  display: flex;
  margin: 14px -14px -14px 0;
  font-family: ${(props) => props.theme.systemFont};
  justify-content: end;
`;

export const Title = styled.h1`
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  font-weight: 600;
  margin: 0;
`;

export const Label = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 600;
  margin: 20px 0 6px 0 !important;
`;

export const UnderText = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.xs};
  color: ${(props) => props.theme.colors.muiGrey[600]};
  font-weight: 400;
  margin: 8px 0 0 0 !important;
`;

export const Modal = styled(MuiModal)`
  && {
    display: flex;
    align-items: center;
    justify-content: center;

    p,
    h1,
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

interface IconProps {
  type: string;
}

export const Icon = styled.div<IconProps>`
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

export const CancelButton = styled(MuiButton)`
  && {
    min-width: 123px;
    font-weight: 600;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
  }
`;

export const PublishButton = styled(MuiButton)`
  && {
    min-width: 123px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.white};
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
    background-color: ${(props) => props.theme.colors.topbarBackground};

    :hover {
      background-color: ${(props) => `${props.theme.colors.topbarBackground}80`};
    }
  }
`;

interface InputProps {
  start?: boolean;
  center?: boolean;
  end?: boolean;
}

export const Input = styled.input<InputProps>`
  width: 100%;
  padding: 12px;
  height: 40px;
  border: 1px solid ${(props) => props.theme.colors.muiGrey[400]};

  ${(props) =>
    props.start &&
    `
      border-top-left-radius: ${props.theme.muiBorderRadius.md};
      border-bottom-left-radius: ${props.theme.muiBorderRadius.md};
      border-right: none;
  `}

  ${(props) =>
    props.center &&
    `
      text-align: center;
      padding: 12px 3px;
      font-weight: 600;
      font-size: 16px;
      border-left: none;
      border-right: none;
      color: ${props.theme.colors.muiGrey[500]};
  `}

  ${(props) =>
    props.end &&
    `
      border-top-right-radius: ${props.theme.muiBorderRadius.md};
      border-bottom-right-radius: ${props.theme.muiBorderRadius.md};
      border-left: none;
  `}
`;
