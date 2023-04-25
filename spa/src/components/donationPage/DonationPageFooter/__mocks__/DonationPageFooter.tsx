import { DonationPageFooterProps } from '../DonationPageFooter';

export const DonationPageFooter = ({ page }: DonationPageFooterProps) => (
  <div data-testid="mock-donation-page-footer" data-page-revenue-program-name={page?.revenue_program.name} />
);

export default DonationPageFooter;
