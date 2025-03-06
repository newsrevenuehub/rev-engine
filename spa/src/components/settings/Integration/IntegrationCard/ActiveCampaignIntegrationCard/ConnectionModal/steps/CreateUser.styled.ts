import styled from 'styled-components';
import { ModalFooter as BaseModalFooter } from 'components/base';

export const Bullets = styled.ul`
  margin-left: 0;
  padding-left: 1.5em;

  & li {
    margin-bottom: 1em;
    margin-left: 0;
  }
`;

export const ModalFooter = styled(BaseModalFooter)`
  justify-content: space-between;
`;

export const Screenshots = styled.div`
  display: grid;
  gap: 30px;
  grid-template-columns: repeat(2, 200px);
`;
