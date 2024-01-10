import { MobileHeaderProps } from '../MobileHeader';

export const MobileHeader = ({ contribution }: MobileHeaderProps) => (
  <div data-testid="mock-mobile-header" data-contribution={contribution.payment_provider_id} />
);
export default MobileHeader;
