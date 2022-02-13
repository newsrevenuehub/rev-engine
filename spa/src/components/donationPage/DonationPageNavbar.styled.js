import styled from 'styled-components';

export const DonationPageNavbar = styled.header`
  width: 100%;
  background: ${(props) =>
    props.bgImg ? `url(${props.bgImg})` : props.theme.colors.cstm_mainHeader || props.theme.colors.white};
  background-size: cover;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 3rem;

  box-shadow: ${(props) => props.theme.shadows[0]};
`;

export const DonationPageNavbarLogo = styled.img`
  display: block;
  max-height: 50px;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
`;
