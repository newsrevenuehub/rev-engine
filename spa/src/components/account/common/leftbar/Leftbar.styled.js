import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';

export const Leftbar = styled.div`
  width: 85%;
  max-width: 506px;
  margin-bottom: 50px;

  color: ${(props) =>
    props.bgColor && props.bgColor === 'purple' ? props.theme.colors.white : props.theme.colors.account.purple[1]};

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
  font-size: 36px;
  line-height: 42px;
  text-transform: capitalize;
  margin: 32px 0px;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: 26px;
    line-height: 30px;
    padding-bottom: 20px;
  }
`;

export const Advantages = styled.div`
  padding-top: 40px;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Divider = styled.div`
  border-top: 2px solid
    ${(props) =>
      props.bgColor && props.bgColor === 'purple'
        ? props.theme.colors.account.yellow[0]
        : props.theme.colors.account.purple[0]};

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: none;
  }
`;

export const Advantage = styled.div`
  display: flex;

  span {
    border-radius: 50%;
    display: inline-block;
    position: relative;
    width: 24px;
    height: 24px;
    padding: 12px;
  }

  svg {
    width: 14px;
    height: 14px;
    top: 5.5px;
    left: 5.4px;
    position: absolute;
  }
`;

export const AdvContent = styled.div`
  margin-left: 20px;
  margin-bottom: 26px;
`;

export const AdvHeading = styled.div`
  font-style: normal;
  font-weight: 400;
  font-size: 18px;
  margin-bottom: 4px;
  line-height: 138.19%;
`;

export const AdvSubHeading = styled.div`
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 138.19%;
`;

export const AdvantageIcon = styled(SvgIcon)`
  width: 16px;
  height: 16px;
  margin-right: 0.5rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    width: 14px;
    height: 14px;
  }
`;
