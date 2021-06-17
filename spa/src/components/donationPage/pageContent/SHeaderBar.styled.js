import styled from 'styled-components';

export const SHeaderBar = styled.header`
  width: 100%;
  background: ${(props) => (props.bgImg ? `url(${props.bgImg})` : '#fff')};
  background-size: cover;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;

  box-shadow: ${(props) => props.theme.shadows[0]};
`;

export const SHeaderLogo = styled.img`
  max-height: 50px;
  width: auto;
`;
