export type FiscalStatus = 'nonprofit' | 'for-profit' | 'fiscally sponsored';

export const TAX_STATUS: {
  NONPROFIT: FiscalStatus;
  FOR_PROFIT: FiscalStatus;
  FISCALLY_SPONSORED: FiscalStatus;
} = {
  NONPROFIT: 'nonprofit',
  FOR_PROFIT: 'for-profit',
  FISCALLY_SPONSORED: 'fiscally sponsored'
};
