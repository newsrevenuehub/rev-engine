import styled from 'styled-components';

export const PageItem = styled.div<{ $disabled: boolean }>`
  cursor: ${(props) => (props.$disabled ? 'not-allowed' : 'pointer')};
  border: 2px solid;
  border-color: ${(props) => (props.$disabled ? props.theme.colors.disabled : props.theme.colors.primary)};
  border-radius: ${(props) => props.theme.radii[0]};
  background: ${(props) => props.theme.colors.paneBackground};
  display: flex;
  flex-direction: row;
  opacity: ${(props) => (props.$disabled ? 0.5 : 1)};
`;

export const ItemIconWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;

export const ItemIcon = styled.div<{ $disabled: boolean }>`
  svg {
    color: ${(props) => (props.$disabled ? props.theme.colors.disabled : props.theme.colors.primary)};
    fill: ${(props) => (props.$disabled ? props.theme.colors.disabled : props.theme.colors.primary)};
    height: 20px;
    width: 20px;
  }
`;

export const ItemContentWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
`;

export const ContentLeft = styled.div`
  flex: 1;
  padding: 1rem 0;
`;

export const ContentRight = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: 1rem;
  justify-content: space-between;
`;

export const ItemName = styled.h5`
  margin: 0 0 0.5rem 0;
  font-family: ${(props) => props.theme.systemFont};
`;

export const ItemDescription = styled.p`
  font-family: ${(props) => props.theme.systemFont};
`;
