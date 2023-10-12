import styled from 'styled-components';

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 373px;
  width: 100%;
  height: 78px;
  position: relative;
  padding: 14px 15px;
`;

export const ArrowLeft = styled.img`
  width: 50px;
  height: 10px;
  position: absolute;
  top: 0;
  left: 12px;
`;

export const ArrowDown = styled.img`
  width: 50px;
  height: 10px;
  position: absolute;
  transform: rotate(90deg);
  top: 32px;
  left: -20px;
`;

export const Dot = styled.div<{ $position: Position }>`
  width: 10px;
  height: 10px;
  position: absolute;
  border-radius: 50%;
  border: 1px solid ${(props) => props.theme.colors.muiLightBlue[800]};
  ${(props) =>
    ({
      'top-left': `
        top: 0;
        left: 0;
      `,
      'top-right': `
        top: 0;
        right: 0;
      `,
      'bottom-left': `
        bottom: 0;
        left: 0;
      `,
      'bottom-right': `
        bottom: 0;
        right: 0;
      `
    })[props.$position]}
`;

export const Button = styled.div<{ $borderRadius: number }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  line-height: 19px;
  color: ${(props) => props.theme.colors.white};
  background: ${(props) => props.theme.colors.topbarBackground};
  border-radius: ${(props) => props.$borderRadius}px;
`;
