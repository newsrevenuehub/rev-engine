import { BannerProps } from '../Banner';

export const Banner = ({ contribution }: BannerProps) => (
  <div data-testid="mock-banner" data-contribution={contribution.id} />
);
export default Banner;
