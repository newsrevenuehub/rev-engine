import styled from 'styled-components';
import BasePageUsage from './PageUsage';

export const Content = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, 170px);
  gap: 2rem;
`;

export const PageUsage = styled(BasePageUsage)`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  font-weight: 600;
  margin-top: 70px;
`;

// accordionAnimation is being used elsewhere.
// TODO: remove when not used anymore

export const accordionAnimation = {
  initial: { y: -10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 }
};
