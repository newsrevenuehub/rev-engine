import { MobileHeaderProps } from '..';

export const MobileHeader = ({ contribution }: MobileHeaderProps) => (
  <div data-testid="mock-mobile-header" data-contribution={contribution.id} />
);
export default MobileHeader;
