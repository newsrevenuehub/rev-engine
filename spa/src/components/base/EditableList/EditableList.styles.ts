import { ButtonBase } from '@material-ui/core';
import styled from 'styled-components';

export const AddButton = styled(ButtonBase)`
  && {
    color: ${({ theme }) => theme.colors.muiTeal[600]};
    margin-left: 8px;
  }
`;

export const Item = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.colors.muiGrey[100]};
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  display: flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  justify-content: space-between;
  padding: 0.5rem;
`;

export const RemoveButton = styled(ButtonBase)`
  && {
    color: ${({ theme }) => theme.colors.caution};
  }
`;

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .NreTextFieldInputLabelRoot {
    display: none;
  }
`;
