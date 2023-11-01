import styled from 'styled-components';

export const LeftbarWrapper = styled.div<{ isCreateAccountPage?: boolean | null }>`
  width: 85%;
  max-width: 506px;
  margin-bottom: 50px;
  z-index: 2;

  color: ${(props) => (props.isCreateAccountPage ? props.theme.colors.white : props.theme.colors.account.purple[1])};

  span {
    background-color: ${(props) => props.theme.colors.account.yellow[0]};
  }

  svg {
    filter: brightness(0) saturate(100%) invert(7%) sepia(1%) saturate(4979%) hue-rotate(214deg) brightness(96%)
      contrast(91%);
  }

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 20px 0px;
  }
`;

export const Logo = styled.img`
  width: 80%;
  max-width: 208px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 50%;
    max-width: 140px;
  }
`;

export const Heading = styled.div`
  font-style: normal;
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.xl};
  line-height: 54px;
  text-transform: capitalize;
  margin: 32px 0px;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
    line-height: 30px;
    padding-bottom: 20px;
  }
`;

export const AdvantagesWrapper = styled.div`
  padding-top: 40px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Divider = styled.div<{ isCreateAccountPage?: boolean | null }>`
  border-top: ${(props) => props.theme.muiBorderRadius.sm} solid
    ${(props) =>
      props.isCreateAccountPage ? props.theme.colors.account.yellow[0] : props.theme.colors.account.purple[0]};

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Advantage = styled.div`
  display: flex;

  span {
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    min-width: 40px;
    height: 40px;
  }

  svg {
    width: 24px;
    height: 24px;

    @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
      width: 14px;
      height: 14px;
    }
  }
`;

export const AdvContent = styled.div`
  margin-left: 20px;
  margin-bottom: 26px;
`;

export const AdvHeading = styled.div`
  font-style: normal;
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  margin-bottom: 4px;
  line-height: 138.19%;
`;

export const AdvSubHeading = styled.div`
  font-style: normal;
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  line-height: 138.19%;
`;
