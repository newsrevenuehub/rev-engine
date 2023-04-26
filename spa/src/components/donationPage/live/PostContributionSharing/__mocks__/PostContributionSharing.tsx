import { PostContributionSharingProps } from '../PostContributionSharing';

export const PostContributionSharing = ({ donationPageUrl, revenueProgram }: PostContributionSharingProps) => (
  <div
    data-testid="mock-post-contribution-sharing"
    data-donation-page-url={donationPageUrl}
    data-revenue-program-name={revenueProgram.name}
  />
);

export default PostContributionSharing;
