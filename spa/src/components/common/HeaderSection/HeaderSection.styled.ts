import styled from 'styled-components';

export const Root = styled.div<{ $variant?: 'dark' }>`
  ${(props) =>
    props.$variant === 'dark' &&
    `
    background-color: ${props.theme.basePalette.greyscale[80]};
    margin-left: -3rem;
    padding: 15px 3rem;
    width: calc(100% + 6rem);

    & h1, & p {
      color: ${props.theme.basePalette.greyscale.white};
    }

    & h1 {
      font-size: ${props.theme.fontSizesUpdated.lgx};
      font-weight: 600;
    }
  `}
`;

export const Sections = styled.div`
  display: grid;
  gap: 25px;
  margin: 20px 0;
`;

export const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizesUpdated.h1};
  font-family: ${({ theme }) => theme.systemFont};
  margin-bottom: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.basePalette.primary.indigo};
`;

export const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-family: ${({ theme }) => theme.systemFont};
  color: ${({ theme }) => theme.basePalette.greyscale[70]};
  margin-bottom: 40px;
`;
