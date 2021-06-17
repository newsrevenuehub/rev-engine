import styled from 'styled-components';

export const GenericThankYou = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  background: ${(props) => props.theme.colors.fieldBackground};
`;

export const ThankYou = styled.div`
  margin-top: 25%;

  h2 {
    font-size: ${(props) => props.theme.fontSizes[6]};
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
    color: ${(props) => props.theme.colors.grey[4]};
    margin: 0;
    padding: 0;
    margin-bottom: 1rem;

    @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
      font-size: ${(props) => props.theme.fontSizes[5]};
    }

    span {
      display: block;
      text-transform: lowercase;
      font-size: ${(props) => props.theme.fontSizes[1]};
      font-weight: normal;
    }
  }
`;

export const Redirect = styled.a`
  margin-top: 2rem;
  display: block;
  text-align: center;
`;
