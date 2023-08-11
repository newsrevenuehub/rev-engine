import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';
import Button from 'elements/buttons/Button';

export const Form = styled.form`
  display: grid;
  gap: 24px;
  margin: 0;
`;

export const IconWrapper = styled.div`
  display: flex;
  height: 25px;
  justify-content: center;
`;

export const Icon = styled(SvgIcon)`
  height: 100%;
  width: auto;
`;

export const SubmitButton = styled(Button)`
  font-family: ${({ theme }) => theme.systemFont};
`;
