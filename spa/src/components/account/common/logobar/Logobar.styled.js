import styled from 'styled-components';

export const LogoBar = styled.div`
  width: 80%;
  max-width: 830px;
  margin-bottom: 50px;
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin: 20px 0px;
  }
`;

export const Heading = styled.div`
  color: ${(props) => props.theme.colors.grey[4]};
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizes[1]};
  line-height: 22px;
  width: 100%;
  text-align: left;
  margin-bottom: 2px;
  padding-left: 22px;
  margin-top: 60px;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    font-size: ${(props) => props.theme.fontSizes[0]};
    line-height: 17px;
    padding-left: 14px;
  }
`;

export const LogoImg = styled.img`
  width: 15%;
  margin: 0.5%;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    width: 30%;
    margin: 1.6%;
  }
`;
