import { useState } from 'react';

import * as S from './DAdditionalInfo.styled';

// Children
import DElement from 'components/donationPage/pageContent/DElement';
import Input from 'elements/inputs/Input';

function DAdditionalInfo({ element, ...props }) {
  const [formState, setFormState] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: value
    });
  };

  return (
    <DElement label="Additional info" {...props} data-testid="d-additional-info">
      {element?.content?.map((input) => (
        <S.AdditionalInputWrapper key={input.name}>
          <Input
            type={input.type}
            label={input.label}
            name={input.name}
            value={formState[input.name] || ''}
            onChange={handleChange}
          />
        </S.AdditionalInputWrapper>
      ))}
    </DElement>
  );
}

DAdditionalInfo.type = 'DAdditionalInfo';
DAdditionalInfo.displayName = 'Additional info';
DAdditionalInfo.description = 'Collect arbitrary data from your donors';
DAdditionalInfo.required = false;
DAdditionalInfo.unique = false;

export default DAdditionalInfo;
