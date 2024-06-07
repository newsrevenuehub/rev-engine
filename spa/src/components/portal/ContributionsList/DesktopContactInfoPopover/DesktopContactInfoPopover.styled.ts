import { IconButton } from 'components/base';
import styled from 'styled-components';

export const ContactInfoButton = styled(IconButton)`
  && {
    height: 28px;
    width: 28px;
    padding: 0;

    svg {
      fill: ${({ theme }) => theme.basePalette.greyscale.white};
    }

    @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
      right: 20px;
    }
  }
`;
