import { CircularProgress as MuiCircularProgress } from '@material-ui/core';
import { Button as BaseButton } from 'components/base';
import styled from 'styled-components';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  align-items: start;
  font-family: ${(props) => props.theme.systemFont};
`;

export const ExportIcon = styled.img`
  filter: invert(45%) sepia(34%) saturate(0%) hue-rotate(171deg) brightness(89%) contrast(89%);
  transform: rotate(-90deg);
  width: 20px;
  height: 20px;
`;

export const CircularProgress = styled(MuiCircularProgress)`
  && {
    color: ${(props) => props.theme.colors.muiGrey[600]};
  }
`;

export const Button = styled(BaseButton)`
  && {
    text-transform: capitalize;
    height: 40px;
    line-height: 16px;
    border-radius: ${(props) => props.theme.muiBorderRadius.lg};
    border: 0.25px solid ${(props) => props.theme.colors.muiGrey[400]};
    box-shadow: none;

    && > span {
      font-weight: 400;
      color: ${(props) => props.theme.colors.muiGrey[600]};
    }

    :hover {
      background-color: ${(props) => props.theme.colors.muiGrey[300]};
    }
  }
`;
