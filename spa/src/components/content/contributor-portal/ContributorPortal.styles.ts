import styled from 'styled-components';

export const FormWrapper = styled.form`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const Label = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.lgx};
  font-weight: 400;
  color: ${(props) => props.theme.basePalette.greyscale['70']};
  margin-bottom: 20px;
  line-height: normal;
`;

export const Description = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  font-weight: 400;
  color: ${(props) => props.theme.basePalette.greyscale.black};
  margin-bottom: 20px;
  line-height: 21px;

  & span {
    color: ${(props) => props.theme.basePalette.greyscale['70']};
    font-weight: 600;
  }
`;

export const InputsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 26px;
  max-width: 432px;
`;

export const ActionWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
`;
