import styled from 'styled-components';

export const Root = styled.div`
  margin: 60px 0;
  max-width: 600px;
`;

export const Heading = styled.div`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  margin-bottom: 10px;
`;

export const Logo = styled.img`
  width: auto;
`;

export const Logos = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  height: 50px;
  justify-content: start;
`;
