import styled from 'styled-components';
import { FormControlLabel, RadioGroup as BaseRadioGroup } from 'components/base';

export const Checkboxes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const Header = styled.h4`
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 600;
  margin-bottom: 10px;
  margin-top: 40px;
`;

export const Tip = styled.p`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  margin-bottom: 18px;
`;

export const RadioGroup = styled(BaseRadioGroup)`
  margin-top: 20px;
  gap: 20px;
`;

export const Text = styled.p`
  color: ${({ theme }) => theme.colors.muiGrey[900]};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;

export const StyledFormControlLabel = styled(FormControlLabel)`
  margin-top: 40px;
`;
