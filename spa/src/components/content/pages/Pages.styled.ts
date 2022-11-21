import styled from 'styled-components';

export const Content = styled.div`
  display: flex;
  justify-content: start;
  align-items: start;
  gap: 2rem;
  flex-wrap: wrap;
`;

// accordionAnimation is being used elsewhere.
// TODO: remove when not used anymore

export const accordionAnimation = {
  initial: { y: -10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 }
};
