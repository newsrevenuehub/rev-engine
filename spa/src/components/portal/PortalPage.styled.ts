import styled from 'styled-components';

export const PoweredBy = styled.div`
  width: 100%;
  gap: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${(props) => props.theme.font.body};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.basePalette.greyscale.black};
  background: ${(props) => props.theme.basePalette.greyscale.grey4};
  padding-bottom: 45px;
`;

export const Header = styled.header`
  background: ${(props) => props.theme.basePalette.primary.indigo};
  background-size: cover;
  height: 60px;
  min-height: 60px;
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
