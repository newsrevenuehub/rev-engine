import styled from 'styled-components';

export const SPageHeading = styled.section`
  background: ${(props) => props.theme.colors.hubBlue};
  padding: 1rem 3rem;
  border-top-left-radius: ${(props) => props.theme.radii[0]};
  border-top-right-radius: ${(props) => props.theme.radii[0]};
`;

export const Heading = styled.h2`
  color: ${(props) => props.theme.colors.white};
  text-align: center;
  font-size: 18px;
  font-weight: bold;
`;
