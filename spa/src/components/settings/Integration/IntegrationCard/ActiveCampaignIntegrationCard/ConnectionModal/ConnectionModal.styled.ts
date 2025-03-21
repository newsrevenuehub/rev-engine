import ActiveCampaignLogo from 'assets/images/activecampaign.svg?react';
import styled from 'styled-components';

export const ModalHeaderIcon = styled(ActiveCampaignLogo)`
  height: 32px;
  width: 32px;
  border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
`;
