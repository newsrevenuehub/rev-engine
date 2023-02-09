import ColorPickerPreview from 'components/common/ColorPickerPreview';
import styled from 'styled-components';

export const ColorPreview = styled(ColorPickerPreview)`
  align-self: center;
  width: 568px;
`;

export const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 42px;
`;

export const Pickers = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex-grow: 1;
  gap: 20px;
`;
