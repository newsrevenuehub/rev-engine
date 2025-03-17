import styled from 'styled-components';
import { ModalFooter as BaseModalFooter } from 'components/base';

export const ModalFooter = styled(BaseModalFooter)`
  justify-content: space-between;
`;

export const Screenshots = styled.div`
  display: grid;
  gap: 30px;
  grid-template-columns: 200px 343px;
  padding-top: 20px;
`;
