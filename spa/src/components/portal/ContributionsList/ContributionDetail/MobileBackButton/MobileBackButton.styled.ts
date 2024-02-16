import { RouterLinkButton } from 'components/base';
import styled from 'styled-components';

export const BackButton = styled(RouterLinkButton)`
  && .NreButtonLabel {
    color: ${({ theme }) => theme.basePalette.greyscale.black};
  }
`;

export const Root = styled.div`
  display: none;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: block;
  }
`;
