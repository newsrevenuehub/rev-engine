import styled from 'styled-components';

export const PoweredBy = styled.div`
  width: 100%;
  gap: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${(props) => props.theme.systemFont};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.basePalette.greyscale.black};
  padding: 45px 0;

  & > span {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const Header = styled.header`
  background: ${(props) => props.theme.basePalette.primary.indigo};
  background-size: cover;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 3rem;

  box-shadow: ${({ theme }) => theme.shadows[0]};
`;

export const Logo = styled.img`
  display: block;
  max-height: 44px;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
`;

export const Root = styled.div`
  background: #f9f9f9;
  display: grid;
  grid-template-rows: 60px 1fr 145px;
  min-height: 100vh;
`;
