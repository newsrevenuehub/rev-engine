import { TextField } from 'components/base';
import styled from 'styled-components';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const Title = styled.h1`
  font-family: ${(props) => props.theme.systemFont};
  color: ${(props) => props.theme.basePalette.greyscale['70']};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 400;
  margin: 0;
`;

// Make the text field select match the appearance of searchable selects in the
// tab.

export const FontSizeTextField = styled(TextField)`
  && {
    .NreTextFieldInput {
      font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
    }

    .NreTextFieldInputLabelFormControl {
      margin-bottom: 8px;
    }

    .NreTextFieldSelectIcon {
      right: 12px;
    }
  }
`;

export const FullLine = styled.div`
  display: grid;
  grid-auto-flow: row;
  flex-grow: 1;
  gap: 20px;
`;

export const Pickers = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex-grow: 1;
  gap: 20px;
`;
