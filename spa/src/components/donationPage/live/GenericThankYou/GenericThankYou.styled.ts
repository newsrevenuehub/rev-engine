import { LinkButton } from 'components/base';
import lighten from 'styles/utils/lighten';
import styled from 'styled-components';

export const Root = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.colors.cstm_mainBackground ?? props.theme.colors.white};
  font-family: ${(props) => props.theme.systemFont};
`;

export const Wrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const InnerContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: ${(props) => props.theme.colors.cstm_formPanelBackground ?? props.theme.colors.white};
  box-shadow: ${(props) => props.theme.shadows[1]};
  width: 100%;
  max-width: 700px;
  border-top: 6px solid ${(props) => props.theme.colors.cstm_ornaments ?? props.theme.colors.primary};
  margin: 2rem 0;
  padding: 1rem 3rem;
`;

export const Header = styled.h2`
  /*
  Disabling typing on font family because it appears styles apply different
  structure (with font_name property) than what it is by default.
  */
  font-family: ${(props) => (props.theme.font.heading as any)?.font_name};
  font-size: ${(props) => props.theme.fontSizes[4]};
  font-weight: 900;
  color: ${(props) => props.theme.colors.grey[4]};
  margin: 0;
  margin-bottom: 1rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    font-size: ${(props) => props.theme.fontSizes[4]};
  }
`;

export const PostThankYouRedirectButton = styled(LinkButton)`
  && {
    /* Imitate the old button style. */
    background-color: ${({ theme }) => theme.colors.primary};
    border: 2px solid ${({ theme }) => theme.colors.primary};
    box-shadow: none;
    height: 48px;
    padding: 0 1rem;
    text-transform: none;

    .NreButtonLabel {
      color: ${({ theme }) => theme.colors.white};
      font-size: ${({ theme }) => theme.fontSizesUpdated.md};
    }

    &:hover {
      background-color: ${({ theme }) => theme.colors.primary};
      border-color: ${({ theme }) => lighten(theme.colors.primary)};
      box-shadow: none;
    }
  }
`;

export const Text = styled.p`
  font-family: ${(props) => props.theme.systemFont};
`;
