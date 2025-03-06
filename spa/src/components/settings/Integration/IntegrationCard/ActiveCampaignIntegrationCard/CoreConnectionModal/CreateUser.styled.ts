import styled from 'styled-components';
import { ModalFooter as BaseModalFooter } from 'components/base';

export const Bullets = styled.ul`
  & li {
    margin-bottom: 1em;
  }
`;

export const ModalFooter = styled(BaseModalFooter)`
  justify-content: space-between;
`;

export const Screenshots = styled.div`
  display: grid;
  gap: 30px;
  grid-template-columns: 1fr 1fr;
`;
