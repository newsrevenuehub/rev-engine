import styled from 'styled-components';

export const Fieldset = styled.fieldset`
  border: none;
  padding: 2rem 0;

  &:not(:first-of-type) {
    border-top: 1px solid #ccc;
  }
`;

export const Prompt = styled.p`
  color: #282828;
  font:
    16px Roboto,
    sans-serif;
`;

export const Field = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
  align-content: stretch;
`;

export const Heading = styled.h2`
  font:
    600 24px Roboto,
    sans-serif;
  margin-top: 0;
`;

export const TextInput = styled.input`
  border: 1px solid rgb(8, 7, 8);
  border-radius: 3px;
  font:
    16px Roboto,
    sans-serif;
  padding: 12px 16px;
`;

export const Select = styled.select`
  border: 1px solid rgb(8, 7, 8);
  border-radius: 3px;
  font:
    16px Roboto,
    sans-serif;
  padding: 12px 16px;
`;

export const Label = styled.label`
  color: #282828;
  font:
    600 16px Roboto,
    sans-serif;
`;
