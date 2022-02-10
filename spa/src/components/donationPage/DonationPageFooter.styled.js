import styled from 'styled-components';

export const DonationPageFooter = styled.footer`
  width: 100%;
  background: ${(props) => props.theme.colors.white};
  padding: 4rem 0;
  box-shadow: ${(props) => props.theme.shadows[0]};
  font-family: ${(props) => props.theme.systemFont};
`;

export const Content = styled.div`
  text-align: center;
  font-size: 12px;

  p {
    margin-top: 1rem;
    font-family: ${(props) => props.theme.systemFont};
  }
`;
