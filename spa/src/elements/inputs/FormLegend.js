import styled from 'styled-components';

function FormLegend({ name, children }) {
  return (
    <FormLegendStyled>
      <NameStyled>{name}</NameStyled>
      {children}
    </FormLegendStyled>
  );
}

export default FormLegend;

const FormLegendStyled = styled.div`
  display: flex;
  flex-direction: column;
`;

const NameStyled = styled.h3`
  border-bottom: 2px solid ${(props) => props.theme.colors.grey[1]};
`;
