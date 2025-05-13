import styled from 'styled-components';

export const Root = styled.div<{ $hideBottomDivider: boolean; $orientation: 'horizontal' | 'vertical' }>`
  display: grid;

  ${({ $orientation }) => {
    switch ($orientation) {
      case 'horizontal':
        return `
          gap: 40px;
          grid-template-columns: 400px 440px;

          // Switch to a vertical layout below our minimum width.

          @media (max-width: 880px) {
            gap: 25px;
            grid-template-columns: 1fr;
          }
        `;
      case 'vertical':
        return 'gap: 25px;';
    }
  }}

  ${(props) =>
    !props.$hideBottomDivider &&
    `
    padding-bottom: 25px;
    border-bottom: 1px solid ${props.theme.basePalette.greyscale['10']};
  `}

  h2,
  p {
    font-family: ${({ theme }) => theme.systemFont};
  }
`;

export const H3 = styled.h3`
  font-size: ${({ theme }) => theme.fontSizesUpdated[20]};
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-weight: 500;
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  margin: 0;
`;

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;
