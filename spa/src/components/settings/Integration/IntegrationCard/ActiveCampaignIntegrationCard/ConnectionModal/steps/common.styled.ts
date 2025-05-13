import styled from 'styled-components';
import { ModalFooter as BaseModalFooter } from 'components/base';

export const ModalFooter = styled(BaseModalFooter)<{ $spaced?: boolean }>`
  padding-top: 30px;
  ${(props) => props.$spaced && 'justify-content: space-between;'}
`;

export const StepRoot = styled.div`
  padding: 0 35px;
`;

export const StepHeading = styled.h3`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 400;
`;

export const StepSubheading = styled.h4`
  color: ${({ theme }) => theme.basePalette.greyscale['80']};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  font-weight: 400;
  margin-bottom: 8px;
`;
