import { PaymentStatus } from 'constants/paymentStatus';
import styled, { DefaultTheme } from 'styled-components';

const statusColors: Record<PaymentStatus, keyof DefaultTheme['colors']['status'] | 'transparent'> = {
  processing: 'processing',
  failed: 'failed',
  flagged: 'transparent',
  paid: 'done',
  rejected: 'transparent',
  canceled: 'warning'
};

const italicizedStatuses: PaymentStatus[] = ['canceled', 'processing'];

export const StatusText = styled('span')<{ status: PaymentStatus }>`
  margin-left: 1rem;
  font-size: 14px;
  font-style: ${({ status }) => (status in italicizedStatuses ? 'italic' : 'normal')};
  padding: 0.2rem 0.8rem;
  color: ${(props) => props.theme.colors.black};
  border-radius: ${(props) => props.theme.muiBorderRadius.md};
  line-height: 1.2;
  background-color: ${({ status, theme }) =>
    status in statusColors ? theme.colors.status[statusColors[status] as keyof typeof theme.colors.status] : 'inherit'};
`;
