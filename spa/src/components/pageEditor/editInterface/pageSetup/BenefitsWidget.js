import Select from 'elements/inputs/Select';
import * as S from './BenefitsWidget.styled';

function BenefitsWidget({ benefits = [], selected, setSelected }) {
  console.log('benefits in that widget: ', benefits);
  return (
    <S.BenefitsWidget>
      <S.SelectWrapper>
        <Select
          label="Donor benefits"
          onSelectedItemChange={({ selectedItem }) => setSelected(selectedItem)}
          selectedItem={selected}
          items={[{ name: '----none----', id: 'None' }].concat(benefits)}
          itemToString={(i) => i.name}
          placeholder="Select a set of benefits..."
          dropdownPosition="above"
          displayAccessor="name"
        />
      </S.SelectWrapper>
    </S.BenefitsWidget>
  );
}

export default BenefitsWidget;
