import { Typography as MuiTypography } from '@material-ui/core';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import styled from 'styled-components';

export const Title = styled(MuiTypography)`
  && {
    color: ${(props) => props.theme.colors.muiGrey[900]};
    font-size: ${(props) => props.theme.fontSizesUpdated.lg};
    font-weight: 600;
  }
`;

export const Label = styled(MuiTypography)`
  && {
    color: ${(props) => props.theme.colors.muiGrey[900]};
    font-size: ${(props) => props.theme.fontSizesUpdated.md};
    font-weight: 600;
  }
`;

export const Highlight = styled.span`
  && {
    color: ${(props) => props.theme.colors.error.primary};
  }
`;

export const InfoIcon = styled(InfoOutlinedIcon)`
  color: ${(props) => props.theme.colors.muiLightBlue[800]};
`;

export const Typography = styled(MuiTypography)`
  && {
    color: ${(props) => props.theme.colors.muiGrey[900]};
    font-size: ${(props) => props.theme.fontSizesUpdated.md};
    font-weight: 400;
    line-height: ${(props) => props.theme.fontSizesUpdated.lg};
    margin-bottom: 22px;
  }
`;

export const ErrorMessage = styled(MuiTypography)`
  && {
    background: ${(props) => props.theme.colors.error.bg};
    border-radius: ${(props) => props.theme.muiBorderRadius.sm};
    font-weight: 400;
    font-size: ${(props) => props.theme.fontSizesUpdated.xs};
    line-height: 24px;
    color: ${(props) => props.theme.colors.muiGrey[600]};
    padding: 0px 6px;
    margin-top: 6px;
  }
`;
