import { FormControlLabel } from 'components/base';
import styled from 'styled-components';

export const AlignedFormControlLabel = styled(FormControlLabel)<{ $smallLabel?: boolean }>`
  && {
    align-items: center;
    column-gap: 10px;
    display: grid;
    grid-template-columns: 60px 1fr;
    margin-bottom: 32px;

    .NreChecked + .NreTrack {
      background: #157cb2;
      border-color: #1370a0;
    }

    .NreFormControlLabelLabel {
      color: ${({ theme }) => theme.colors.muiGrey[900]};

      ${(props) =>
        props.$smallLabel &&
        `
        color: ${props.theme.colors.muiGrey[600]};
        font-size: 14px;
        font-weight: 600;
        `}
    }
  }
`;
