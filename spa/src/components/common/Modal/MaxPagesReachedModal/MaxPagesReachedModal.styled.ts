import { InfoOutlined } from '@material-ui/icons';
import { ModalHeader as BaseModalHeader, ModalContent as BaseModalContent } from 'components/base';
import styled from 'styled-components';

export const Card = styled.div`
  border-radius: ${({ theme }) => theme.muiBorderRadius.xl};
  box-shadow:
    0px -1px 4px rgba(0, 0, 0, 0.03),
    0px 3px 4px rgba(0, 0, 0, 0.12);
  padding: 13px 16px;
  width: 240px;
`;

export const CardHeader = styled.h3`
  border-bottom: 1px solid ${({ theme }) => theme.basePalette.greyscale['10']};
  font-family: 'DM Mono', monospace;
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  font-weight: 500;
  margin: 0;
  padding-bottom: 12px;
`;

export const CardHeaderHighlight = styled.span`
  background-color: ${({ theme }) => theme.plan.core.background};
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  padding: 0 0.1em;
`;

export const ModalContent = styled(BaseModalContent)`
  width: 540px;
`;

export const ModalHeader = styled(BaseModalHeader)`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
`;

export const ModalHeaderIcon = styled(InfoOutlined)`
  && {
    color: ${({ theme }) => theme.basePalette.primary.purple};
  }
`;

export const PlanLimit = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  margin-bottom: 2em;
`;

export const Recommendation = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
`;

export const PricingLink = styled.a`
  color: ${({ theme }) => theme.basePalette.secondary.hyperlink};
  font-weight: 600;
`;

export const RedEmphasis = styled.strong`
  color: ${({ theme }) => theme.colors.error.primary};
`;

export const BenefitsList = styled.ul`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  padding-left: 1em;

  & li {
    margin-bottom: 0.33em;
  }
`;
