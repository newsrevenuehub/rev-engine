import styled from 'styled-components';

export const List = styled.ul`
  display: flex;
  padding: 0;
  flex-direction: column;
  gap: 26px;
`;

export const Item = styled.li`
  display: flex;
  gap: 10px;
`;

export const Icon = styled.div`
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background-color: ${(props) => props.theme.colors.account.purple[1]};
  fill: ${(props) => props.theme.plan.free.background};
  display: flex;
  align-items: center;
  justify-content: center;

  > svg {
    height: 16px;
    width: 16px;
  }
`;

export const Text = styled.p`
  color: ${(props) => props.theme.colors.muiGrey[900]};
  flex: 1;
  margin: 0;
  line-height: 28px;
`;
