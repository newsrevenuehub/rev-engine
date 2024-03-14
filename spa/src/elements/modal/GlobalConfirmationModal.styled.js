import styled from 'styled-components';

export const Root = styled.div`
  border-radius: ${(props) => props.theme.radii[0]};
  background: ${(props) => props.theme.colors.white};
  padding: 2rem;
  box-shadow: ${(props) => props.theme.shadows[2]};
  font-family: ${(props) => props.theme.systemFont};
`;

export const Warning = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

export const Icon = styled.div`
  color: ${(props) => props.theme.colors.warning};

  && svg {
    height: 80px;
    width: 80px;
  }
`;

export const Message = styled.p`
  margin: 2rem 0;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Buttons = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-around;

  & button:not(:last-child) {
    margin-right: 3rem;
  }
`;
