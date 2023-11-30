import * as S from './GroupedLabel.styled';

import { Required } from 'elements/inputs/BaseField.styled';

function GroupedLabel({ children, required }) {
  return (
    <S.GroupedLabel>
      {children} {required && <Required>*</Required>}
    </S.GroupedLabel>
  );
}

export default GroupedLabel;
