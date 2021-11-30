import { baseInputStyles } from 'elements/inputs/BaseField.styled';
import styled from 'styled-components';
import { Radio as SemanticRadio } from 'semantic-ui-react';
import MaterialSlider from '@material-ui/core/Slider';
import Input from 'elements/inputs/Input';

export const StylesEditor = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const StylesForm = styled.div`
  flex: 1;
  padding: 3rem 3rem 0 3rem;
`;

export const NameInput = styled(Input)``;

export const StylesFieldset = styled.fieldset`
  border: none;
  padding: 4rem 0;
  margin: 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${(props) => props.theme.colors.grey[1]};
  }

  & > div {
    margin: 1rem;
  }
`;

export const FieldRow = styled.div`
  display: flex;
  flex-direction: row;
  & > :not(:last-child) {
    margin-right: 3rem;
  }
`;

export const FieldsetLabel = styled.h3`
  font-size: ${(props) => props.theme.fontSizes[2]};
  font-weight: 100;
  letter-spacing: 0.03em;
  color: ${(props) => props.theme.colors.black};
`;

export const FieldsetDescription = styled.p`
  font-size: ${(props) => props.theme.fontSizes[0]};
  font-weight: 500;
  color: ${(props) => props.theme.colors.black};
`;

export const ColorPickerWrapper = styled.div`
  width: 200px;
  position: relative;
`;

export const NoColor = styled.p``;

export const ColorButton = styled.button`
  ${baseInputStyles};
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: row;
  margin: 1rem 0.5rem 1rem 0;
  align-items: center;
  cursor: pointer;
`;

export const ColorButtonSwatch = styled.div`
  border-top-left-radius: ${(props) => props.theme.radii[0]};
  border-bottom-left-radius: ${(props) => props.theme.radii[0]};
  border: 1px solid;
  border-color: ${(props) => props.theme.colors.grey[1]};
  border-right: none;
  background: ${(props) => props.color};
  width: 30px;
  height: calc(100% + 2px);
  margin-left: -1px;
`;

export const ColorButtonHex = styled.span`
  flex: 1;
  /* color: ${(props) => props.color}; */
  /* font-weight: bold; */
  font-weight: 200;
`;

export const PickerWrapper = styled.div`
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1101;
`;

export const PickerOverlay = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  z-index: 1100;
`;

export const ColorButtonWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const SliderWrapper = styled.div``;

export const SliderBox = styled.div`
  ${baseInputStyles};
  width: 200px;
  display: flex;
  align-items: center;
  padding: 0 2rem;
  border-radius: ${(props) => props.radius}px;
`;

export const Slider = styled(MaterialSlider)`
  && {
    color: ${(props) => props.theme.colors.primary};
  }
`;

export const TextExample = styled.div`
  padding: 1rem;
  border: 1px solid ${(props) => props.theme.colors.grey[1]};
  border-radius: ${(props) => props.theme.radii[1]};
  position: relative;
`;

export const PangramText = styled.div`
  & > * {
    margin-top: 0;
  }

  em {
    display: block;
    margin-top: 1rem;
    font-size: 10px;
  }

  h2 {
    font-size: ${(props) => props.newStyles.fontSizes[3]};
    font-family: ${(props) => props.newStyles.font.heading?.font_name};
    font-weight: normal;
  }
  h4 {
    font-size: ${(props) => props.newStyles.fontSizes[2]};
    font-family: ${(props) => props.newStyles.font.heading?.font_name};
    font-weight: normal;
  }
  p {
    font-size: ${(props) => props.newStyles.fontSizes[1]};
    font-family: ${(props) => props.newStyles.font.body?.font_name};
    font-weight: normal;
  }
`;

export const Checkbox = styled(SemanticRadio)`
  &.ui.toggle.checkbox input:checked ~ .box:before,
  &.ui.toggle.checkbox input:checked ~ label:before {
    background-color: ${(props) => props.theme.colors.primary} !important;
  }
`;

export const Buttons = styled.div`
  border-top: 1px solid ${(props) => props.theme.colors.grey[1]};
  height: 50px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding-top: 1rem;
  margin-bottom: 2rem;

  & button:not(:last-child) {
    margin-right: 2rem;
  }
`;
