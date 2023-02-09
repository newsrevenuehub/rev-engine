import { ColorPickerPreviewProps } from '../ColorPickerPreview';

export const ColorPickerPreview = (props: ColorPickerPreviewProps) => (
  <div
    data-testid="mock-color-picker-preview"
    data-header-color={props.headerColor}
    data-background={props.backgroundColor}
    data-panel-background={props.panelBackgroundColor}
    data-buttons={props.buttonsColor}
    data-accents={props.accentsColor}
    data-input-background={props.inputBackgroundColor}
    data-input-border={props.inputBorderColor}
  />
);

export default ColorPickerPreview;
