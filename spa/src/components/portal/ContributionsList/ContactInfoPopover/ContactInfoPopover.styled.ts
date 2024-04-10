import MuiTypography from '@material-ui/core/Typography';
import { IconButton } from 'components/base';
import styled from 'styled-components';

export const ContactInfoButton = styled(IconButton)`
  && {
    position: absolute;
    top: 0;
    right: 0;
    height: 28px;
    width: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      fill: ${({ theme }) => theme.basePalette.greyscale.white};
    }

    @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
      right: 20px;
    }
  }
`;

export const TitleTypography = styled(MuiTypography)`
  && {
    color: ${(props) => props.theme.basePalette.greyscale.black};
    font-size: ${(props) => props.theme.fontSizesUpdated[20]};
    line-height: ${(props) => props.theme.fontSizesUpdated.lgx};
    font-weight: 500;
    margin-bottom: 15px;
  }
`;

export const ContactTypography = styled(MuiTypography)`
  && {
    color: ${(props) => props.theme.basePalette.greyscale.black};
    font-size: ${(props) => props.theme.fontSizesUpdated.md};
    line-height: ${(props) => props.theme.fontSizesUpdated[20]};
    font-weight: 400;
  }
`;

export const ContactInfoDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 17px;
  margin-top: 18px;
  margin-left: 14px;
`;

export const ContactRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};

  p {
    color: ${({ theme }) => theme.basePalette.greyscale.black};
  }

  svg {
    fill: ${({ theme }) => theme.basePalette.greyscale.black};
    height: 24px;
    width: 24px;
  }
`;

export const StyledLink = styled.a`
  color: ${({ theme }) => theme.basePalette.primary.engineBlue};
  font-weight: 500;
`;
