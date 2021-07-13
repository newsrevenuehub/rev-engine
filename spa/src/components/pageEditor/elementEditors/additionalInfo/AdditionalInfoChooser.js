import * as S from './AdditionalInfoChooser.styled';
import Select from 'elements/inputs/Select';

function AdditionalInfoChooser({ metadata = [], existingElements = [], setSelected }) {
  return (
    <S.AdditionalInfoChooser>
      <Select
        label="Select Additional Donor Information"
        onSelectedItemChange={({ selectedItem }) => setSelected(selectedItem)}
        items={metadata.filter((e) => !existingElements.map((ee) => ee.name).includes(e.key))}
        itemToString={(i) => i.label}
        dropdownPosition="below"
        displayAccessor="label"
      />
    </S.AdditionalInfoChooser>
  );
}

export default AdditionalInfoChooser;
