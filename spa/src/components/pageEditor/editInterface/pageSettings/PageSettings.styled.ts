import { TextField } from 'components/base';
import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Controls = styled.div`
  display: grid;
  gap: 20px;
  width: 90%;
  margin: 28px auto;
`;

export const ImageSelectorHelpText = styled.div`
  color: rgba(0, 0, 0, 0.54);
  font-family: Roboto, sans-serif;
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.03333em;
  margin-top: 4px;
`;

export const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 600;
`;

export const LocaleSelect = styled(TextField)`
  width: 200px;
`;

export const Title = styled.h1`
  font-family: ${({ theme }) => theme.systemFont};
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 400;
  margin: 0 0 12px 0;
`;

export const Explanation = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;
