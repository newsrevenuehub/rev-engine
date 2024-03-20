import { FormControlLabel } from 'components/base';
import styled from 'styled-components';

export const Intervals = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

export const AllowOtherFormControlLabel = styled(FormControlLabel)`
  && .NreFormControlLabelLabel {
    font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  }
`;

export const Tip = styled.p`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  font-weight: 500;
  margin-bottom: 45px;
`;
