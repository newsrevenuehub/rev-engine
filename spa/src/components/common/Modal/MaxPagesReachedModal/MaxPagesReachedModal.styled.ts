import { ModalContent as BaseModalContent } from 'components/base';
import styled from 'styled-components';

export const Card = styled.div`
  box-shadow: 0px -1px 4px rgba(0, 0, 0, 0.03), 0px 3px 4px rgba(0, 0, 0, 0.12);
  padding: 13px 16px;
  width: 240px;
`;

export const CardHeader = styled.h3`
  border-bottom: 1px solid ${({ theme }) => theme.colors.muiGrey[100]};
  font-family: 'DM Mono', monospace;
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 500;
  margin: 0;
  padding-bottom: 12px;
`;

export const CardHeaderHighlight = styled.span`
  background-color: #62ffe3;
  padding: 0 0.1em;
`;

export const ModalContent = styled(BaseModalContent)`
  width: 540px;
`;

export const PlanLimit = styled.p`
  margin-bottom: 2em;
`;

export const PricingLink = styled.a`
  font-weight: 600;
`;

export const RedEmphasis = styled.strong`
  color: ${({ theme }) => theme.colors.error.primary};
`;

export const BenefitsList = styled.ul`
  padding-left: 1em;

  & li {
    margin-bottom: 0.33em;
  }
`;
