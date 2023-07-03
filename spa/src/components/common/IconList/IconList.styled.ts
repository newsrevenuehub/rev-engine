import styled from 'styled-components';

export const List = styled.ul`
  display: flex;
  padding: 0;
  flex-direction: column;
  gap: 26px;
`;

export const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Icon = styled.div<{ $size: 'small' | 'medium' }>`
  ${(props) => {
    switch (props.$size) {
      case 'small':
        return `
        height: 24px;
        width: 24px;

        > svg {
          height: 16px;
          width: 16px;
        }
      `;
      case 'medium':
        return `
        height: 30px;
        width: 30px;

        > svg {
          height: 18.5px;
          width: 18.5px;
        }
      `;
    }
  }}
  border-radius: 50%;
  background-color: ${(props) => props.theme.colors.account.purple[1]};
  fill: ${(props) => props.theme.plan.free.background};
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const Text = styled.p`
  color: ${(props) => props.theme.colors.muiGrey[900]};
  flex: 1;
  margin: 0;
  line-height: 21px;
`;
