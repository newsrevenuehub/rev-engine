import * as S from './Organization.styled';

import FormLegend from 'elements/inputs/FormLegend';
import { FormGroup } from 'elements/inputs/FormGroup.styled';
import Input from 'elements/inputs/Input';

function Organization() {
  return (
    <S.Organization>
      <S.OrganizationPanel>
        <h1>Organization settings</h1>
        <FormLegend>
          <FormGroup>
            <Input label="A Thing" />
            <Input label="Another Thing" />
          </FormGroup>
        </FormLegend>
      </S.OrganizationPanel>
    </S.Organization>
  );
}

export default Organization;
