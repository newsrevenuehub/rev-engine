import styled from 'styled-components';

export const Root = styled.header<{ $bgImage?: string | null }>`
  background: ${(props) =>
    props.$bgImage
      ? `url(${props.$bgImage})`
      : props.theme.colors.cstm_mainHeader ?? props.theme.basePalette.greyscale.white};
  background-size: cover;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 3rem;

  box-shadow: ${({ theme }) => theme.shadows[0]};
`;

export const Logo = styled.img`
  display: block;
  max-height: 50px;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
`;
