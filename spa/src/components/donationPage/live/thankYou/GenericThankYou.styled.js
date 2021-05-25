import styled from 'styled-components';

export const GenericThankYou = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  background: ${(props) => props.theme.colors.fieldBackground};
`;

export const ThankYou = styled.div`
  margin-top: 25%;

  h1 {
    font-size: 96px;
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
    color: ${(props) => props.theme.colors.grey[4]};
    margin: 0;
    margin-bottom: 1rem;

    @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
      font-size: 84px;
    }
  }
  h4 {
    font-size: 18px;
    font-weight: normal;
    text-align: center;
    color: ${(props) => props.theme.colors.grey[4]};
  }
`;

export const Redirect = styled.a`
  margin-top: 2rem;
  display: block;
  text-align: center;
`;
