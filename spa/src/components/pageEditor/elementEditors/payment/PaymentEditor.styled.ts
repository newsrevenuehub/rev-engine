import { FormControlLabel } from 'components/base';
import styled from 'styled-components';

export const AlignedFormControlLabel = styled(FormControlLabel)`
  && {
    align-items: center;
    column-gap: 10px;
    display: grid;
    grid-template-columns: 60px 1fr;
    margin-bottom: 32px;

    .NreChecked + .NreTrack {
      background: ${({ theme }) => theme.basePalette.primary.engineBlue};
      border-color: #1370a0;
    }

    .NreFormControlLabelLabel {
      color: ${({ theme }) => theme.basePalette.greyscale.black};
    }
  }
`;

export const Tip = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  margin-bottom: 45px;
`;

export const StrongTip = styled.strong`
  font-weight: 500;
`;
