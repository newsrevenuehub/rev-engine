import styled from 'styled-components';

export const DonationPageNavbar = styled.header`
  width: 100%;
  background: ${(props) => (props.bgImg ? `url(${props.bgImg})` : props.theme.colors.white)};
  background-size: cover;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;

  box-shadow: ${(props) => props.theme.shadows[0]};
`;

export const DonationPageNavbarLogo = styled.img`
  max-height: 50px;
  width: auto;
`;
