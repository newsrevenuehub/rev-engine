import * as S from './StylesChooser.styled';
import Select from 'elements/inputs/Select';

function StylesChooser({ styles = [], selected, setSelected }) {
  return (
    <S.StylesChooser>
      <Select
        label="Choose from existing styles"
        onSelectedItemChange={({ selectedItem }) => setSelected(selectedItem)}
        // selectedItem is coerced to an empty string if it's null to prevent React
        // from treating the select as an uncontrolled component.
        selectedItem={selected === null ? '' : selected}
        items={[{ name: '----none----', id: '' }].concat(styles)}
        itemToString={(i) => i.name}
        placeholder="Select a style"
        dropdownPosition="below"
        displayAccessor="name"
      />
    </S.StylesChooser>
  );
}

export default StylesChooser;
