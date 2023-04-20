import { FormControlLabel } from 'components/base';
import styled from 'styled-components';

export const Controls = styled.div`
  display: flex;
`;

export const EnabledControls = styled.div`
  flex-grow: 1;
  padding-top: 24px;
`;

export const Error = styled.p`
  color: ${({ theme }) => theme.colors.error.primary};
`;

export const Fieldset = styled.fieldset`
  border: none;
  padding: 0;
  margin: 0;
`;

export const Legend = styled.legend`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  font-weight: 600;
  height: 24px;
  margin-bottom: 8px;
`;

export const RadioFormControlLabel = styled(FormControlLabel)`
  && {
    display: flex;
    justify-content: center;
    margin: 0 0 33px 0;
  }
`;

export const ToggleFormControlLabel = styled(FormControlLabel)`
  && {
    align-items: center;
    column-gap: 10px;
    display: grid;
    grid-template-columns: 50px 1fr;
    margin-bottom: 20px;

    .NreChecked + .NreTrack {
      background: ${({ theme }) => theme.basePalette.primary.engineBlue};
      border-color: #1370a0;
    }

    .NreFormControlLabelLabel {
      color: ${({ theme }) => theme.basePalette.greyscale.black};
      font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
    }
  }
`;
