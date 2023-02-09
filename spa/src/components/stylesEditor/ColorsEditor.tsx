import { ColorPicker } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { ColorPreview, Pickers, Root } from './ColorsEditor.styles';

const ColorsEditorPropTypes = {
  colors: PropTypes.object,
  onChangeColor: PropTypes.func.isRequired
};

export interface ColorsEditorProps extends InferProps<typeof ColorsEditorPropTypes> {
  colors?: {
    cstm_CTAs: string;
    cstm_formPanelBackground: string;
    cstm_inputBackground: string;
    cstm_inputBorder: string;
    cstm_mainBackground: string;
    cstm_mainHeader: string;
    cstm_ornaments: string;
  };
  onChangeColor: (name: string, value: string) => void;
}

const pickers = [
  { field: 'cstm_mainHeader', label: 'Main header' },
  { field: 'cstm_mainBackground', label: 'Main background' },
  { field: 'cstm_formPanelBackground', label: 'Form panel background' },
  { field: 'cstm_CTAs', label: 'CTAs' },
  { field: 'cstm_ornaments', label: 'Ornaments' },
  { field: 'cstm_inputBackground', label: 'Input background' },
  { field: 'cstm_inputBorder', label: 'Input border' }
];

export function ColorsEditor({ colors, onChangeColor }: ColorsEditorProps) {
  if (!colors) {
    return null;
  }

  return (
    <Root>
      <Pickers>
        {pickers.map(({ field, label }) => (
          <ColorPicker
            id={`colors-editor-${field}`}
            key={field}
            label={label}
            onChange={(value) => onChangeColor(field, value)}
            value={colors ? colors[field as keyof typeof colors] : ''}
          />
        ))}
      </Pickers>
      <ColorPreview
        headerColor={colors.cstm_mainHeader}
        backgroundColor={colors.cstm_mainBackground}
        panelBackgroundColor={colors.cstm_formPanelBackground}
        buttonsColor={colors.cstm_CTAs}
        accentsColor={colors.cstm_ornaments}
        inputBackgroundColor={colors.cstm_inputBackground}
        inputBorderColor={colors.cstm_inputBorder}
      />
    </Root>
  );
}

ColorsEditor.propTypes = ColorsEditorPropTypes;
export default ColorsEditor;
