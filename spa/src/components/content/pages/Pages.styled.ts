import styled from 'styled-components';
import BasePageUsage from './PageUsage';

export const Content = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, 170px);
  gap: 2rem;
`;

export const CustomizeContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

export const SectionWrapper = styled.div`
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.basePalette.greyscale['10']};
  padding: 20px 25px;
  margin-right: -26px;
  margin-left: -26px;
`;

export const WideMargin = styled.div`
  margin-right: -26px;
  margin-left: -26px;
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
